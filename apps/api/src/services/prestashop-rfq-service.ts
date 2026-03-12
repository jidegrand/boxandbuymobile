import type {
  CurrentCartRfqResponse,
  RfqDetail,
  RfqItem,
  RfqListResponse,
  RfqSummary,
  SubmitRfqInput,
  SubmitRfqResponse
} from "@boxandbuy/contracts";

import { randomBytes } from "node:crypto";

import mysql from "mysql2/promise";

import { env } from "../env";
import { getPrestashopConfig, getPrestashopPool } from "./prestashop-context";
import { PrestashopBusinessService } from "./prestashop-business-service";

type CartRow = {
  id_cart: number;
  id_currency: number;
};

type CartProductRow = {
  id_product: number;
  id_product_attribute: number;
  quantity: number;
  reference: string | null;
  name: string;
  base_price: string | number;
  attribute_price: string | number | null;
};

type RfqSummaryRow = {
  id_bbbusiness_rfq: number;
  id_cart: number;
  reference: string;
  status: "submitted" | "approved" | "rejected" | "expired";
  cart_total_tax_incl: string | number;
  currency_iso: string | null;
  customer_note: string | null;
  admin_note: string | null;
  quote_token: string | null;
  quote_expires_at: string | Date | null;
  submitted_at: string | Date;
  reviewed_at: string | Date | null;
  item_count: string | number;
};

type RfqItemRow = {
  id_bbbusiness_rfq_item: number;
  id_product: number;
  id_product_attribute: number;
  product_name: string;
  product_reference: string | null;
  quantity: number;
  unit_price_tax_incl: string | number;
  line_total_tax_incl: string | number;
};

export class RfqServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "business_required"
      | "inactive_account"
      | "cart_empty"
      | "invalid_payload"
      | "unexpected"
  ) {
    super(message);
    this.name = "RfqServiceError";
  }
}

export class PrestashopRfqService {
  constructor(private readonly businessService = new PrestashopBusinessService()) {}

  async listRfqs(customerId: string): Promise<RfqListResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          rfq.id_bbbusiness_rfq,
          rfq.id_cart,
          rfq.reference,
          rfq.status,
          rfq.cart_total_tax_incl,
          rfq.currency_iso,
          rfq.customer_note,
          rfq.admin_note,
          rfq.quote_token,
          rfq.quote_expires_at,
          rfq.submitted_at,
          rfq.reviewed_at,
          (
            SELECT COALESCE(SUM(rfq_item.quantity), 0)
            FROM \`${config.prefix}bbbusiness_rfq_item\` rfq_item
            WHERE rfq_item.id_bbbusiness_rfq = rfq.id_bbbusiness_rfq
          ) AS item_count
        FROM \`${config.prefix}bbbusiness_rfq\` rfq
        WHERE rfq.id_customer = ?
        ORDER BY rfq.id_bbbusiness_rfq DESC
        LIMIT 25
      `,
      [parsedCustomerId]
    );

    return {
      items: (rows as RfqSummaryRow[]).map((row) => this.mapRfqSummary(row))
    };
  }

  async getCurrentCartRfq(customerId: string): Promise<CurrentCartRfqResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const cart = await this.findCurrentCart(parsedCustomerId);

    if (!cart) {
      return { rfq: null };
    }

    const rfq = await this.findLatestOpenRfqForCart(cart.id_cart, parsedCustomerId);
    return {
      rfq: rfq ? this.mapRfqSummary(rfq) : null
    };
  }

  async getRfqById(customerId: string, rfqId: string): Promise<RfqDetail | null> {
    const parsedCustomerId = this.parseId(customerId);
    const parsedRfqId = this.parseId(rfqId);
    const summary = await this.findRfqSummary(parsedRfqId, parsedCustomerId);

    if (!summary) {
      return null;
    }

    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          id_bbbusiness_rfq_item,
          id_product,
          id_product_attribute,
          product_name,
          product_reference,
          quantity,
          unit_price_tax_incl,
          line_total_tax_incl
        FROM \`${config.prefix}bbbusiness_rfq_item\`
        WHERE id_bbbusiness_rfq = ?
        ORDER BY id_bbbusiness_rfq_item ASC
      `,
      [parsedRfqId]
    );

    return {
      ...this.mapRfqSummary(summary),
      items: (rows as RfqItemRow[]).map((row) => this.mapRfqItem(row))
    };
  }

  async createFromCurrentCart(customerId: string, input: SubmitRfqInput): Promise<SubmitRfqResponse> {
    const overview = await this.businessService.getOverview(customerId);

    if (!overview.accountActive) {
      throw new RfqServiceError("Your account is disabled. Contact support to continue.", "inactive_account");
    }

    if (!overview.isBusinessCustomer) {
      throw new RfqServiceError(
        "RFQ is currently available for approved Business customers.",
        "business_required"
      );
    }

    const parsedCustomerId = this.parseId(customerId);
    const cart = await this.findCurrentCart(parsedCustomerId);

    if (!cart) {
      throw new RfqServiceError("Your cart is empty. Add items before requesting a quote.", "cart_empty");
    }

    const products = await this.getCartProducts(cart.id_cart);
    if (!products.length) {
      throw new RfqServiceError("Your cart is empty. Add items before requesting a quote.", "cart_empty");
    }

    const existing = await this.findLatestOpenRfqForCart(cart.id_cart, parsedCustomerId);
    if (existing) {
      return {
        created: false,
        message: `An RFQ already exists for this cart (${existing.reference}).`,
        rfq: this.mapRfqSummary(existing)
      };
    }

    const currencyCode = await this.getCurrencyIsoCode(cart.id_currency);
    const now = this.formatDate(new Date());
    const expiryDays = await this.getQuoteExpiryDays();
    const quoteExpiresAt = this.formatDate(new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000));
    const totalAmount = products.reduce((sum, product) => sum + product.lineTotal, 0);
    const quoteToken = randomBytes(24).toString("hex");
    const config = await getPrestashopConfig();
    const pool = await getPrestashopPool();

    const [insertResult] = await pool.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO \`${config.prefix}bbbusiness_rfq\` (
          id_customer,
          id_cart,
          id_currency,
          currency_iso,
          reference,
          status,
          cart_total_tax_incl,
          customer_note,
          quote_token,
          quote_expires_at,
          submitted_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, '', 'submitted', ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        parsedCustomerId,
        cart.id_cart,
        cart.id_currency,
        currencyCode,
        totalAmount,
        this.nullableText(input.customerNote),
        quoteToken,
        quoteExpiresAt,
        now,
        now,
        now
      ]
    );

    const idRfq = insertResult.insertId;
    const reference = `RFQ-${this.formatReferenceDate(new Date())}-${String(idRfq).padStart(5, "0")}`;

    await pool.execute(
      `
        UPDATE \`${config.prefix}bbbusiness_rfq\`
        SET reference = ?
        WHERE id_bbbusiness_rfq = ?
      `,
      [reference, idRfq]
    );

    for (const product of products) {
      await pool.execute(
        `
          INSERT INTO \`${config.prefix}bbbusiness_rfq_item\` (
            id_bbbusiness_rfq,
            id_product,
            id_product_attribute,
            product_name,
            product_reference,
            quantity,
            unit_price_tax_incl,
            line_total_tax_incl,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          idRfq,
          product.id_product,
          product.id_product_attribute,
          product.name,
          product.reference,
          product.quantity,
          product.unitPrice,
          product.lineTotal,
          now
        ]
      );
    }

    const created = await this.findRfqSummary(idRfq, parsedCustomerId);

    if (!created) {
      throw new RfqServiceError("RFQ submission failed. Please try again.", "unexpected");
    }

    return {
      created: true,
      message: `RFQ submitted successfully. Reference: ${reference}`,
      rfq: this.mapRfqSummary(created)
    };
  }

  private async findCurrentCart(customerId: number): Promise<CartRow | null> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT cart.id_cart, cart.id_currency
        FROM \`${config.prefix}cart\` cart
        LEFT JOIN \`${config.prefix}orders\` orders
          ON orders.id_cart = cart.id_cart
        WHERE cart.id_customer = ?
          AND orders.id_order IS NULL
        ORDER BY cart.date_upd DESC, cart.id_cart DESC
        LIMIT 1
      `,
      [customerId]
    );

    return (rows[0] as CartRow | undefined) ?? null;
  }

  private async findLatestOpenRfqForCart(cartId: number, customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          rfq.id_bbbusiness_rfq,
          rfq.id_cart,
          rfq.reference,
          rfq.status,
          rfq.cart_total_tax_incl,
          rfq.currency_iso,
          rfq.customer_note,
          rfq.admin_note,
          rfq.quote_token,
          rfq.quote_expires_at,
          rfq.submitted_at,
          rfq.reviewed_at,
          (
            SELECT COALESCE(SUM(rfq_item.quantity), 0)
            FROM \`${config.prefix}bbbusiness_rfq_item\` rfq_item
            WHERE rfq_item.id_bbbusiness_rfq = rfq.id_bbbusiness_rfq
          ) AS item_count
        FROM \`${config.prefix}bbbusiness_rfq\` rfq
        WHERE rfq.id_cart = ?
          AND rfq.id_customer = ?
          AND (
            rfq.status = 'submitted'
            OR (
              rfq.status = 'approved'
              AND (rfq.quote_expires_at IS NULL OR rfq.quote_expires_at >= NOW())
            )
          )
        ORDER BY rfq.id_bbbusiness_rfq DESC
        LIMIT 1
      `,
      [cartId, customerId]
    );

    return (rows[0] as RfqSummaryRow | undefined) ?? null;
  }

  private async findRfqSummary(rfqId: number, customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          rfq.id_bbbusiness_rfq,
          rfq.id_cart,
          rfq.reference,
          rfq.status,
          rfq.cart_total_tax_incl,
          rfq.currency_iso,
          rfq.customer_note,
          rfq.admin_note,
          rfq.quote_token,
          rfq.quote_expires_at,
          rfq.submitted_at,
          rfq.reviewed_at,
          (
            SELECT COALESCE(SUM(rfq_item.quantity), 0)
            FROM \`${config.prefix}bbbusiness_rfq_item\` rfq_item
            WHERE rfq_item.id_bbbusiness_rfq = rfq.id_bbbusiness_rfq
          ) AS item_count
        FROM \`${config.prefix}bbbusiness_rfq\` rfq
        WHERE rfq.id_bbbusiness_rfq = ?
          AND rfq.id_customer = ?
        LIMIT 1
      `,
      [rfqId, customerId]
    );

    return (rows[0] as RfqSummaryRow | undefined) ?? null;
  }

  private async getCartProducts(cartId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          cart_product.id_product,
          cart_product.id_product_attribute,
          cart_product.quantity,
          product.reference,
          product_lang.name,
          product_shop.price AS base_price,
          product_attribute_shop.price AS attribute_price
        FROM \`${config.prefix}cart_product\` cart_product
        INNER JOIN \`${config.prefix}cart\` cart
          ON cart.id_cart = cart_product.id_cart
        INNER JOIN \`${config.prefix}product\` product
          ON product.id_product = cart_product.id_product
        INNER JOIN \`${config.prefix}product_shop\` product_shop
          ON product_shop.id_product = product.id_product
          AND product_shop.id_shop = cart.id_shop
        INNER JOIN \`${config.prefix}product_lang\` product_lang
          ON product_lang.id_product = product.id_product
          AND product_lang.id_lang = cart.id_lang
          AND product_lang.id_shop = cart.id_shop
        LEFT JOIN \`${config.prefix}product_attribute_shop\` product_attribute_shop
          ON product_attribute_shop.id_product_attribute = cart_product.id_product_attribute
          AND product_attribute_shop.id_shop = cart.id_shop
        WHERE cart_product.id_cart = ?
        ORDER BY cart_product.id_product ASC, cart_product.id_product_attribute ASC
      `,
      [cartId]
    );

    return (rows as CartProductRow[]).map((row) => {
      const unitPrice = this.toAmount(row.base_price) + this.toAmount(row.attribute_price);
      return {
        id_product: row.id_product,
        id_product_attribute: row.id_product_attribute,
        quantity: row.quantity,
        reference: row.reference?.trim() || null,
        name: row.name,
        unitPrice,
        lineTotal: unitPrice * row.quantity
      };
    });
  }

  private async getCurrencyIsoCode(currencyId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT iso_code
        FROM \`${config.prefix}currency\`
        WHERE id_currency = ?
        LIMIT 1
      `,
      [currencyId]
    );

    return (rows[0]?.iso_code as string | undefined) ?? "USD";
  }

  private async getQuoteExpiryDays() {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT value
        FROM \`${config.prefix}configuration\`
        WHERE name = 'BBBUSINESS_QUOTE_EXPIRY_DAYS'
        LIMIT 1
      `
    );

    const parsed = Number.parseInt(String(rows[0]?.value ?? ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  private mapRfqSummary(row: RfqSummaryRow): RfqSummary {
    const quoteToken = this.normalizeText(row.quote_token);
    const quoteDownloadable = this.isQuoteDownloadable(row.status);
    const submittedAt = this.normalizeDateTime(row.submitted_at) ?? this.formatDate(new Date());
    const reviewedAt = this.normalizeDateTime(row.reviewed_at);
    const quoteExpiresAt = this.normalizeDateTime(row.quote_expires_at);
    const checkoutAvailable = this.isCheckoutAvailable(row.status, row.quote_expires_at);

    return {
      id: String(row.id_bbbusiness_rfq),
      cartId: String(row.id_cart),
      reference: row.reference,
      status: row.status,
      currencyCode: this.normalizeText(row.currency_iso) ?? "USD",
      totalAmount: this.toAmount(row.cart_total_tax_incl),
      itemCount: this.toInteger(row.item_count),
      customerNote: this.normalizeText(row.customer_note),
      adminNote: this.normalizeText(row.admin_note),
      submittedAt,
      reviewedAt,
      quoteExpiresAt,
      quoteDownloadable,
      checkoutAvailable,
      downloadUrl:
        quoteDownloadable && quoteToken
          ? this.buildModuleUrl("quote", row.id_bbbusiness_rfq, quoteToken)
          : undefined,
      checkoutUrl:
        checkoutAvailable && quoteToken
          ? this.buildModuleUrl("checkout", row.id_bbbusiness_rfq, quoteToken)
          : undefined
    };
  }

  private mapRfqItem(row: RfqItemRow): RfqItem {
    return {
      id: String(row.id_bbbusiness_rfq_item),
      productId: String(row.id_product),
      productAttributeId: row.id_product_attribute > 0 ? String(row.id_product_attribute) : undefined,
      name: row.product_name,
      sku: this.normalizeText(row.product_reference),
      quantity: row.quantity,
      unitPrice: this.toAmount(row.unit_price_tax_incl),
      lineTotal: this.toAmount(row.line_total_tax_incl)
    };
  }

  private buildModuleUrl(controller: "quote" | "checkout", rfqId: number, quoteToken: string) {
    const params = new URLSearchParams({
      fc: "module",
      module: "bbbusiness",
      controller,
      id_rfq: String(rfqId),
      quote_token: quoteToken
    });

    return `${env.prestashopBaseUrl}/index.php?${params.toString()}`;
  }

  private isQuoteDownloadable(status: RfqSummaryRow["status"]) {
    return status === "approved" || status === "expired";
  }

  private isCheckoutAvailable(status: RfqSummaryRow["status"], quoteExpiresAt: string | Date | null) {
    if (status !== "approved") {
      return false;
    }

    if (!quoteExpiresAt) {
      return true;
    }

    const normalized =
      quoteExpiresAt instanceof Date ? quoteExpiresAt.toISOString() : String(quoteExpiresAt).replace(" ", "T");
    const expiresAt = new Date(normalized);
    return !Number.isNaN(expiresAt.getTime()) ? expiresAt.getTime() >= Date.now() : true;
  }

  private parseId(value: string) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new RfqServiceError("Invalid identifier.", "invalid_payload");
    }

    return parsed;
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  private formatReferenceDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  private toAmount(value: string | number | null | undefined) {
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toInteger(value: string | number | null | undefined) {
    const parsed = Number.parseInt(String(value ?? 0), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeText(value: unknown) {
    if (value === null || value === undefined) {
      return undefined;
    }

    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  private normalizeDateTime(value: unknown) {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  private nullableText(value: string | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
