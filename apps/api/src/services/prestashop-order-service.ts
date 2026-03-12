import type {
  CheckoutSession,
  OrderDetail,
  OrderHistoryEntry,
  OrderLine,
  OrdersResponse,
  OrderStatus,
  OrderSummary
} from "@boxandbuy/contracts";

import mysql from "mysql2/promise";

import { env } from "../env";
import {
  buildPrestashopImageUrl,
  getPrestashopConfig,
  getPrestashopPool
} from "./prestashop-context";
import { PrestashopCartService } from "./prestashop-cart-service";

type OrderSummaryRow = {
  id_order: number;
  reference: string | null;
  id_shop: number;
  id_lang: number;
  id_cart: number;
  current_state: number;
  secure_key: string;
  payment: string | null;
  module: string | null;
  module_id: number | null;
  total_paid_tax_incl: string | number;
  total_products_wt: string | number;
  total_shipping_tax_incl: string | number;
  invoice_number: number;
  tracking_number: string | null;
  date_add: string;
  valid: number;
  currency_code: string | null;
  item_count: string | number;
  current_state_name: string | null;
  current_state_color: string | null;
  current_state_paid: number;
  current_state_shipped: number;
};

type OrderLineRow = {
  id_order_detail: number;
  product_id: number;
  product_attribute_id: number | null;
  product_name: string;
  product_quantity: number;
  product_reference: string | null;
  unit_price_tax_incl: string | number;
  total_price_tax_incl: string | number;
  product_slug: string | null;
  cover_image_id: number | null;
};

type OrderHistoryRow = {
  id_order_history: number;
  id_order_state: number;
  date_add: string;
  state_name: string | null;
  state_color: string | null;
  state_paid: number;
  state_shipped: number;
};

export class PrestashopOrderService {
  constructor(private readonly cartService = new PrestashopCartService()) {}

  async listOrders(customerId: string): Promise<OrdersResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          o.id_order,
          o.reference,
          o.id_shop,
          o.id_lang,
          o.id_cart,
          o.current_state,
          o.secure_key,
          o.payment,
          o.module,
          storefront_module.id_module AS module_id,
          o.total_paid_tax_incl,
          o.total_products_wt,
          o.total_shipping_tax_incl,
          o.invoice_number,
          o.date_add,
          o.valid,
          currency.iso_code AS currency_code,
          (
            SELECT COALESCE(SUM(order_detail.product_quantity), 0)
            FROM \`${config.prefix}order_detail\` order_detail
            WHERE order_detail.id_order = o.id_order
          ) AS item_count,
          (
            SELECT order_carrier.tracking_number
            FROM \`${config.prefix}order_carrier\` order_carrier
            WHERE order_carrier.id_order = o.id_order
              AND order_carrier.tracking_number IS NOT NULL
              AND order_carrier.tracking_number <> ''
            ORDER BY order_carrier.id_order_carrier DESC
            LIMIT 1
          ) AS tracking_number,
          order_state_lang.name AS current_state_name,
          order_state.color AS current_state_color,
          order_state.paid AS current_state_paid,
          order_state.shipped AS current_state_shipped
        FROM \`${config.prefix}orders\` o
        LEFT JOIN \`${config.prefix}currency\` currency
          ON currency.id_currency = o.id_currency
        LEFT JOIN \`${config.prefix}order_state\` order_state
          ON order_state.id_order_state = o.current_state
        LEFT JOIN \`${config.prefix}order_state_lang\` order_state_lang
          ON order_state_lang.id_order_state = o.current_state
          AND order_state_lang.id_lang = o.id_lang
        LEFT JOIN \`${config.prefix}module\` storefront_module
          ON storefront_module.name = o.module
        WHERE o.id_customer = ?
        ORDER BY o.date_add DESC, o.id_order DESC
        LIMIT 50
      `,
      [parsedCustomerId]
    );

    return {
      orders: (rows as OrderSummaryRow[]).map((row) => this.mapOrderSummary(row))
    };
  }

  async getOrderById(customerId: string, orderId: string): Promise<OrderDetail | null> {
    const summaryRow = await this.findOrderSummaryRow(customerId, orderId);

    if (!summaryRow) {
      return null;
    }

    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [lineResult, historyResult] = await Promise.all([
      pool.execute<mysql.RowDataPacket[]>(
        `
          SELECT
            order_detail.id_order_detail,
            order_detail.product_id,
            order_detail.product_attribute_id,
            order_detail.product_name,
            order_detail.product_quantity,
            order_detail.product_reference,
            order_detail.unit_price_tax_incl,
            order_detail.total_price_tax_incl,
            product_lang.link_rewrite AS product_slug,
            cover.id_image AS cover_image_id
          FROM \`${config.prefix}order_detail\` order_detail
          LEFT JOIN \`${config.prefix}product_lang\` product_lang
            ON product_lang.id_product = order_detail.product_id
            AND product_lang.id_lang = ?
            AND product_lang.id_shop = ?
          LEFT JOIN \`${config.prefix}image\` cover
            ON cover.id_product = order_detail.product_id
            AND cover.cover = 1
          WHERE order_detail.id_order = ?
          ORDER BY order_detail.id_order_detail ASC
        `,
        [summaryRow.id_lang, summaryRow.id_shop, summaryRow.id_order]
      ),
      pool.execute<mysql.RowDataPacket[]>(
        `
          SELECT
            order_history.id_order_history,
            order_history.id_order_state,
            order_history.date_add,
            order_state_lang.name AS state_name,
            order_state.color AS state_color,
            order_state.paid AS state_paid,
            order_state.shipped AS state_shipped
          FROM \`${config.prefix}order_history\` order_history
          LEFT JOIN \`${config.prefix}order_state\` order_state
            ON order_state.id_order_state = order_history.id_order_state
          LEFT JOIN \`${config.prefix}order_state_lang\` order_state_lang
            ON order_state_lang.id_order_state = order_history.id_order_state
            AND order_state_lang.id_lang = ?
          WHERE order_history.id_order = ?
          ORDER BY order_history.date_add DESC, order_history.id_order_history DESC
        `,
        [summaryRow.id_lang, summaryRow.id_order]
      )
    ]);

    const lines = await Promise.all(
      (lineResult[0] as OrderLineRow[]).map((row) => this.mapOrderLine(row))
    );
    const history = (historyResult[0] as OrderHistoryRow[]).map((row) => this.mapOrderHistory(row));

    return {
      ...this.mapOrderSummary(summaryRow),
      isValid: this.toBoolean(summaryRow.valid),
      paymentModule: this.normalizeText(summaryRow.module),
      confirmationUrl: this.buildConfirmationUrl(summaryRow),
      lines,
      history
    };
  }

  async getCheckoutSession(customerId: string): Promise<CheckoutSession> {
    const cartResponse = await this.cartService.getCart(customerId);
    const { cart } = cartResponse;

    if (!cart.items.length) {
      return {
        mode: "web_redirect",
        status: "empty_cart",
        cartId: cart.id,
        currencyCode: cart.currencyCode,
        itemCount: cart.totalQuantity,
        subtotalAmount: cart.subtotalAmount,
        estimatedTotalAmount: cart.estimatedTotalAmount,
        requiresStorefrontLogin: true,
        checkoutReady: false,
        message: "Your cart is empty. Add products before continuing to checkout."
      };
    }

    if (!cart.checkoutReady) {
      return {
        mode: "web_redirect",
        status: "missing_addresses",
        cartId: cart.id,
        currencyCode: cart.currencyCode,
        itemCount: cart.totalQuantity,
        subtotalAmount: cart.subtotalAmount,
        estimatedTotalAmount: cart.estimatedTotalAmount,
        requiresStorefrontLogin: true,
        checkoutReady: false,
        message: "Select both delivery and invoice addresses before continuing to checkout."
      };
    }

    return {
      mode: "web_redirect",
      status: "ready",
      cartId: cart.id,
      currencyCode: cart.currencyCode,
      itemCount: cart.totalQuantity,
      subtotalAmount: cart.subtotalAmount,
      estimatedTotalAmount: cart.estimatedTotalAmount,
      requiresStorefrontLogin: true,
      checkoutReady: true,
      checkoutUrl: this.buildStorefrontUrl({
        controller: "authentication",
        back: "order"
      }),
      message:
        "Continue in secure web checkout. If the storefront asks you to sign in again, complete that step and review the cart before paying."
    };
  }

  private async findOrderSummaryRow(customerId: string, orderId: string) {
    const parsedCustomerId = this.parseId(customerId);
    const parsedOrderId = this.parseId(orderId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          o.id_order,
          o.reference,
          o.id_shop,
          o.id_lang,
          o.id_cart,
          o.current_state,
          o.secure_key,
          o.payment,
          o.module,
          storefront_module.id_module AS module_id,
          o.total_paid_tax_incl,
          o.total_products_wt,
          o.total_shipping_tax_incl,
          o.invoice_number,
          o.date_add,
          o.valid,
          currency.iso_code AS currency_code,
          (
            SELECT COALESCE(SUM(order_detail.product_quantity), 0)
            FROM \`${config.prefix}order_detail\` order_detail
            WHERE order_detail.id_order = o.id_order
          ) AS item_count,
          (
            SELECT order_carrier.tracking_number
            FROM \`${config.prefix}order_carrier\` order_carrier
            WHERE order_carrier.id_order = o.id_order
              AND order_carrier.tracking_number IS NOT NULL
              AND order_carrier.tracking_number <> ''
            ORDER BY order_carrier.id_order_carrier DESC
            LIMIT 1
          ) AS tracking_number,
          order_state_lang.name AS current_state_name,
          order_state.color AS current_state_color,
          order_state.paid AS current_state_paid,
          order_state.shipped AS current_state_shipped
        FROM \`${config.prefix}orders\` o
        LEFT JOIN \`${config.prefix}currency\` currency
          ON currency.id_currency = o.id_currency
        LEFT JOIN \`${config.prefix}order_state\` order_state
          ON order_state.id_order_state = o.current_state
        LEFT JOIN \`${config.prefix}order_state_lang\` order_state_lang
          ON order_state_lang.id_order_state = o.current_state
          AND order_state_lang.id_lang = o.id_lang
        LEFT JOIN \`${config.prefix}module\` storefront_module
          ON storefront_module.name = o.module
        WHERE o.id_customer = ?
          AND o.id_order = ?
        LIMIT 1
      `,
      [parsedCustomerId, parsedOrderId]
    );

    return (rows[0] as OrderSummaryRow | undefined) ?? null;
  }

  private async mapOrderLine(row: OrderLineRow): Promise<OrderLine> {
    return {
      id: String(row.id_order_detail),
      productId: String(row.product_id),
      productAttributeId:
        row.product_attribute_id && row.product_attribute_id > 0 ? String(row.product_attribute_id) : undefined,
      name: row.product_name,
      sku: this.normalizeText(row.product_reference),
      quantity: row.product_quantity,
      unitPrice: this.toAmount(row.unit_price_tax_incl),
      lineTotal: this.toAmount(row.total_price_tax_incl),
      imageUrl: row.cover_image_id ? await buildPrestashopImageUrl(row.cover_image_id, "home_default") : undefined,
      productSlug: this.normalizeText(row.product_slug)
    };
  }

  private mapOrderHistory(row: OrderHistoryRow): OrderHistoryEntry {
    return {
      id: String(row.id_order_history),
      stateId: String(row.id_order_state),
      label: row.state_name?.trim() || `State ${row.id_order_state}`,
      color: this.normalizeText(row.state_color),
      occurredAt: row.date_add,
      isPaid: this.toBoolean(row.state_paid),
      isShipped: this.toBoolean(row.state_shipped)
    };
  }

  private mapOrderSummary(row: OrderSummaryRow): OrderSummary {
    return {
      id: String(row.id_order),
      reference: row.reference?.trim() || `#${row.id_order}`,
      placedAt: row.date_add,
      currencyCode: this.normalizeText(row.currency_code) ?? "USD",
      itemCount: this.toInteger(row.item_count),
      subtotalAmount: this.toAmount(row.total_products_wt),
      shippingAmount: this.toAmount(row.total_shipping_tax_incl),
      totalAmount: this.toAmount(row.total_paid_tax_incl),
      paymentMethod: this.normalizeText(row.payment),
      trackingNumber: this.normalizeText(row.tracking_number),
      invoiceUrl: this.buildInvoiceUrl(row),
      status: this.mapStatus(row)
    };
  }

  private mapStatus(row: OrderSummaryRow): OrderStatus {
    return {
      id: String(row.current_state),
      label: row.current_state_name?.trim() || `State ${row.current_state}`,
      color: this.normalizeText(row.current_state_color),
      isPaid: this.toBoolean(row.current_state_paid),
      isShipped: this.toBoolean(row.current_state_shipped)
    };
  }

  private buildInvoiceUrl(row: OrderSummaryRow) {
    if (!row.invoice_number || !row.secure_key || row.secure_key === "-1") {
      return undefined;
    }

    return this.buildStorefrontUrl({
      controller: "pdf-invoice",
      id_order: row.id_order,
      secure_key: row.secure_key
    });
  }

  private buildConfirmationUrl(row: OrderSummaryRow) {
    if (!row.id_cart || !row.module_id || !row.secure_key || row.secure_key === "-1") {
      return undefined;
    }

    return this.buildStorefrontUrl({
      controller: "order-confirmation",
      id_cart: row.id_cart,
      id_module: row.module_id,
      id_order: row.id_order,
      key: row.secure_key
    });
  }

  private buildStorefrontUrl(params: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }

      query.set(key, String(value));
    }

    return `${env.prestashopBaseUrl}/index.php?${query.toString()}`;
  }

  private normalizeText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private parseId(value: string) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error("Invalid identifier");
    }

    return parsed;
  }

  private toAmount(value: string | number | null | undefined) {
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toBoolean(value: string | number | boolean | null | undefined) {
    return value === true || value === 1 || value === "1";
  }

  private toInteger(value: string | number | null | undefined) {
    const parsed = Number.parseInt(String(value ?? 0), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
