import type {
  Address,
  AddressInput,
  Cart,
  CartAddressSelection,
  CartItemInput,
  CartResponse,
  CountrySummary,
  ProductSummary,
  StateSummary
} from "@boxandbuy/contracts";

import mysql from "mysql2/promise";

import {
  buildPrestashopImageUrl,
  getPrestashopConfig,
  getPrestashopContext,
  getPrestashopPool
} from "./prestashop-context";

type CustomerRow = {
  id_customer: number;
  secure_key: string;
  id_lang: number | null;
  firstname: string;
  lastname: string;
  email: string;
};

type CartRow = {
  id_cart: number;
  id_address_delivery: number;
  id_address_invoice: number;
  id_lang: number;
  id_currency: number;
};

type CartLineRow = {
  id_product: number;
  id_product_attribute: number;
  quantity: number;
  reference: string | null;
  name: string;
  link_rewrite: string | null;
  description_short: string | null;
  base_price: string | number;
  attribute_price: string | number | null;
  cover_image_id: number | null;
  stock_quantity: string | number | null;
  out_of_stock: string | number | null;
};

type AddressRow = {
  id_address: number;
  alias: string;
  firstname: string;
  lastname: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  postcode: string | null;
  phone: string | null;
  phone_mobile: string | null;
  id_country: number;
  country_name: string;
  country_iso_code: string;
  id_state: number | null;
  state_name: string | null;
};

type CountryRow = {
  id_country: number;
  name: string;
  iso_code: string;
  contains_states: number;
  need_zip_code: number;
};

type StateRow = {
  id_state: number;
  id_country: number;
  name: string;
  iso_code: string;
};

type ProductTargetRow = {
  id_product: number;
  id_product_attribute: number | null;
};

type OwnedAddressRow = {
  id_address: number;
  id_customer: number;
};

export class PrestashopCartService {
  async getCart(customerId: string): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const cart = await this.findCurrentCart(parsedCustomerId);

    if (!cart) {
      return {
        cart: {
          currencyCode: (await getPrestashopContext()).currencyCode,
          items: [],
          totalQuantity: 0,
          subtotalAmount: 0,
          estimatedTotalAmount: 0,
          checkoutReady: false
        },
        addresses: await this.listAddresses(parsedCustomerId)
      };
    }

    return this.buildCartResponse(parsedCustomerId, cart);
  }

  async addItem(customerId: string, input: CartItemInput): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const cart = await this.ensureCart(parsedCustomerId);
    const target = await this.resolveCartProductTarget(input.productId);
    const pool = await getPrestashopPool();
    const now = this.formatDate(new Date());
    const lineAddressId = cart.id_address_delivery || 0;

    await pool.execute(
      `
        INSERT INTO \`${(await getPrestashopConfig()).prefix}cart_product\` (
          id_cart,
          id_product,
          id_address_delivery,
          id_shop,
          id_product_attribute,
          id_customization,
          quantity,
          date_add
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        ON DUPLICATE KEY UPDATE
          quantity = quantity + VALUES(quantity),
          date_add = VALUES(date_add)
      `,
      [
        cart.id_cart,
        target.id_product,
        lineAddressId,
        (await getPrestashopContext()).defaultShopId,
        target.id_product_attribute ?? 0,
        input.quantity,
        now
      ]
    );

    await this.touchCart(cart.id_cart);

    return this.getCart(customerId);
  }

  async updateItemQuantity(customerId: string, productId: string, quantity: number): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const cart = await this.findCurrentCart(parsedCustomerId);

    if (!cart) {
      return this.getCart(customerId);
    }

    const target = await this.resolveCartProductTarget(productId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();

    if (quantity <= 0) {
      await pool.execute(
        `
          DELETE FROM \`${config.prefix}cart_product\`
          WHERE id_cart = ?
            AND id_product = ?
            AND id_product_attribute = ?
        `,
        [cart.id_cart, target.id_product, target.id_product_attribute ?? 0]
      );
    } else {
      await pool.execute(
        `
          UPDATE \`${config.prefix}cart_product\`
          SET quantity = ?
          WHERE id_cart = ?
            AND id_product = ?
            AND id_product_attribute = ?
        `,
        [quantity, cart.id_cart, target.id_product, target.id_product_attribute ?? 0]
      );
    }

    await this.touchCart(cart.id_cart);

    return this.getCart(customerId);
  }

  async removeItem(customerId: string, productId: string): Promise<CartResponse> {
    return this.updateItemQuantity(customerId, productId, 0);
  }

  async setAddressSelection(customerId: string, selection: CartAddressSelection): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const [deliveryAddress, invoiceAddress] = await Promise.all([
      this.requireOwnedAddress(parsedCustomerId, selection.deliveryAddressId),
      this.requireOwnedAddress(parsedCustomerId, selection.invoiceAddressId)
    ]);
    const cart = await this.ensureCart(parsedCustomerId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const nextDeliveryId = deliveryAddress.id_address;
    const nextInvoiceId = invoiceAddress.id_address;
    const previousDeliveryId = cart.id_address_delivery || 0;

    await pool.execute(
      `
        UPDATE \`${config.prefix}cart\`
        SET id_address_delivery = ?, id_address_invoice = ?, date_upd = ?
        WHERE id_cart = ?
      `,
      [nextDeliveryId, nextInvoiceId, this.formatDate(new Date()), cart.id_cart]
    );

    if (previousDeliveryId !== nextDeliveryId) {
      await pool.execute(
        `
          UPDATE \`${config.prefix}cart_product\`
          SET id_address_delivery = ?
          WHERE id_cart = ?
            AND id_address_delivery IN (?, 0)
        `,
        [nextDeliveryId, cart.id_cart, previousDeliveryId]
      );
    }

    return this.getCart(customerId);
  }

  async createAddress(customerId: string, input: AddressInput): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const customer = await this.requireCustomer(parsedCustomerId);
    const prepared = await this.prepareAddressInput(input);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const now = this.formatDate(new Date());

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO \`${config.prefix}address\` (
          id_country,
          id_state,
          id_customer,
          id_manufacturer,
          id_supplier,
          id_warehouse,
          alias,
          company,
          lastname,
          firstname,
          address1,
          address2,
          postcode,
          city,
          other,
          phone,
          phone_mobile,
          vat_number,
          dni,
          date_add,
          date_upd,
          active,
          deleted
        ) VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, '', '', ?, ?, 1, 0)
      `,
      [
        prepared.countryId,
        prepared.stateId,
        customer.id_customer,
        prepared.alias,
        prepared.company,
        prepared.lastName,
        prepared.firstName,
        prepared.address1,
        prepared.address2,
        prepared.postcode,
        prepared.city,
        prepared.phone,
        prepared.phoneMobile,
        now,
        now
      ]
    );

    const cart = await this.findCurrentCart(parsedCustomerId);

    if (cart && !cart.id_address_delivery && !cart.id_address_invoice) {
      await this.setAddressSelection(customerId, {
        deliveryAddressId: String(result.insertId),
        invoiceAddressId: String(result.insertId)
      });
    }

    return this.getCart(customerId);
  }

  async updateAddress(customerId: string, addressId: string, input: AddressInput): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const ownedAddress = await this.requireOwnedAddress(parsedCustomerId, addressId);
    const prepared = await this.prepareAddressInput(input);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();

    await pool.execute(
      `
        UPDATE \`${config.prefix}address\`
        SET
          id_country = ?,
          id_state = ?,
          alias = ?,
          company = ?,
          lastname = ?,
          firstname = ?,
          address1 = ?,
          address2 = ?,
          postcode = ?,
          city = ?,
          phone = ?,
          phone_mobile = ?,
          date_upd = ?
        WHERE id_address = ?
          AND id_customer = ?
          AND deleted = 0
      `,
      [
        prepared.countryId,
        prepared.stateId,
        prepared.alias,
        prepared.company,
        prepared.lastName,
        prepared.firstName,
        prepared.address1,
        prepared.address2,
        prepared.postcode,
        prepared.city,
        prepared.phone,
        prepared.phoneMobile,
        this.formatDate(new Date()),
        ownedAddress.id_address,
        parsedCustomerId
      ]
    );

    return this.getCart(customerId);
  }

  async deleteAddress(customerId: string, addressId: string): Promise<CartResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const ownedAddress = await this.requireOwnedAddress(parsedCustomerId, addressId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const cart = await this.findCurrentCart(parsedCustomerId);

    await pool.execute(
      `
        UPDATE \`${config.prefix}address\`
        SET active = 0, deleted = 1, date_upd = ?
        WHERE id_address = ?
          AND id_customer = ?
      `,
      [this.formatDate(new Date()), ownedAddress.id_address, parsedCustomerId]
    );

    if (cart && (cart.id_address_delivery === ownedAddress.id_address || cart.id_address_invoice === ownedAddress.id_address)) {
      const replacementId = await this.findFirstAddressId(parsedCustomerId, ownedAddress.id_address);
      const nextDeliveryId =
        cart.id_address_delivery === ownedAddress.id_address ? replacementId ?? 0 : cart.id_address_delivery;
      const nextInvoiceId =
        cart.id_address_invoice === ownedAddress.id_address ? replacementId ?? nextDeliveryId : cart.id_address_invoice;
      const previousDeliveryId = cart.id_address_delivery || 0;

      await pool.execute(
        `
          UPDATE \`${config.prefix}cart\`
          SET id_address_delivery = ?, id_address_invoice = ?, date_upd = ?
          WHERE id_cart = ?
        `,
        [nextDeliveryId, nextInvoiceId, this.formatDate(new Date()), cart.id_cart]
      );

      if (previousDeliveryId !== nextDeliveryId) {
        await pool.execute(
          `
            UPDATE \`${config.prefix}cart_product\`
            SET id_address_delivery = ?
            WHERE id_cart = ?
              AND id_address_delivery = ?
          `,
          [nextDeliveryId, cart.id_cart, previousDeliveryId]
        );
      }
    }

    return this.getCart(customerId);
  }

  async listCountries(): Promise<CountrySummary[]> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT country.id_country, country.iso_code, country.contains_states, country.need_zip_code, country_lang.name
        FROM \`${config.prefix}country\` country
        INNER JOIN \`${config.prefix}country_lang\` country_lang
          ON country_lang.id_country = country.id_country
          AND country_lang.id_lang = ?
        WHERE country.active = 1
        ORDER BY country_lang.name ASC
      `,
      [context.defaultLanguageId]
    );

    return (rows as CountryRow[]).map((row) => ({
      id: String(row.id_country),
      name: row.name,
      isoCode: row.iso_code,
      containsStates: Boolean(row.contains_states),
      needsZipCode: Boolean(row.need_zip_code)
    }));
  }

  async listStates(countryId: string): Promise<StateSummary[]> {
    const parsedCountryId = this.parseId(countryId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_state, id_country, name, iso_code
        FROM \`${config.prefix}state\`
        WHERE id_country = ?
          AND active = 1
        ORDER BY name ASC
      `,
      [parsedCountryId]
    );

    return (rows as StateRow[]).map((row) => ({
      id: String(row.id_state),
      countryId: String(row.id_country),
      name: row.name,
      isoCode: row.iso_code
    }));
  }

  private async buildCartResponse(customerId: number, cart: CartRow, preloadedAddresses?: Address[]): Promise<CartResponse> {
    const context = await getPrestashopContext();
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [lineRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          cart_product.id_product,
          cart_product.id_product_attribute,
          cart_product.quantity,
          product.reference,
          product_lang.name,
          product_lang.link_rewrite,
          product_lang.description_short,
          product_shop.price AS base_price,
          product_attribute_shop.price AS attribute_price,
          cover.id_image AS cover_image_id,
          COALESCE(stock.quantity, 0) AS stock_quantity,
          COALESCE(stock.out_of_stock, 0) AS out_of_stock
        FROM \`${config.prefix}cart_product\` cart_product
        INNER JOIN \`${config.prefix}product\` product
          ON product.id_product = cart_product.id_product
        INNER JOIN \`${config.prefix}product_shop\` product_shop
          ON product_shop.id_product = product.id_product
          AND product_shop.id_shop = ?
        INNER JOIN \`${config.prefix}product_lang\` product_lang
          ON product_lang.id_product = product.id_product
          AND product_lang.id_lang = ?
          AND product_lang.id_shop = ?
        LEFT JOIN \`${config.prefix}product_attribute_shop\` product_attribute_shop
          ON product_attribute_shop.id_product_attribute = cart_product.id_product_attribute
          AND product_attribute_shop.id_shop = ?
        LEFT JOIN \`${config.prefix}stock_available\` stock
          ON stock.id_product = cart_product.id_product
          AND stock.id_product_attribute = cart_product.id_product_attribute
          AND stock.id_shop = ?
        LEFT JOIN \`${config.prefix}image\` cover
          ON cover.id_product = cart_product.id_product
          AND cover.cover = 1
        WHERE cart_product.id_cart = ?
        ORDER BY cart_product.date_add DESC, cart_product.id_product DESC
      `,
      [
        context.defaultShopId,
        context.defaultLanguageId,
        context.defaultShopId,
        context.defaultShopId,
        context.defaultShopId,
        cart.id_cart
      ]
    );

    const items = await Promise.all(
      (lineRows as CartLineRow[]).map(async (row) => {
        const unitPrice =
          (Number.parseFloat(String(row.base_price ?? "0")) || 0) +
          (Number.parseFloat(String(row.attribute_price ?? "0")) || 0);
        const stockQuantity = Number.parseInt(String(row.stock_quantity ?? "0"), 10) || 0;
        const outOfStock = Number.parseInt(String(row.out_of_stock ?? "0"), 10) || 0;
        const product: ProductSummary = {
          id: String(row.id_product),
          name: row.name,
          slug: row.link_rewrite ?? undefined,
          sku: row.reference ?? undefined,
          price: unitPrice,
          currencyCode: context.currencyCode,
          imageUrl: row.cover_image_id ? await buildPrestashopImageUrl(row.cover_image_id, "home_default") : undefined,
          inStock:
            stockQuantity > 0 ||
            outOfStock === 1 ||
            (outOfStock === 2 && context.allowOutOfStockOrders),
          stockQuantity,
          shortDescription: this.normalizeCopy(row.description_short)
        };

        return {
          id: `${row.id_product}:${row.id_product_attribute || 0}`,
          productId: String(row.id_product),
          productAttributeId: row.id_product_attribute ? String(row.id_product_attribute) : undefined,
          quantity: row.quantity,
          unitPrice,
          lineTotal: unitPrice * row.quantity,
          product
        };
      })
    );

    const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const addresses = preloadedAddresses ?? (await this.listAddresses(customerId, cart));

    return {
      cart: {
        id: String(cart.id_cart),
        currencyCode: context.currencyCode,
        items,
        totalQuantity,
        subtotalAmount,
        estimatedTotalAmount: subtotalAmount,
        deliveryAddressId: cart.id_address_delivery ? String(cart.id_address_delivery) : undefined,
        invoiceAddressId: cart.id_address_invoice ? String(cart.id_address_invoice) : undefined,
        checkoutReady: items.length > 0 && Boolean(cart.id_address_delivery) && Boolean(cart.id_address_invoice)
      } satisfies Cart,
      addresses
    };
  }

  private async ensureCart(customerId: number) {
    const context = await getPrestashopContext();
    const customer = await this.requireCustomer(customerId);
    const existing = await this.findCurrentCart(customerId);

    if (existing) {
      if (!existing.id_address_delivery || !existing.id_address_invoice) {
        const firstAddressId = await this.findFirstAddressId(customerId);

        if (firstAddressId) {
          const pool = await getPrestashopPool();
          const config = await getPrestashopConfig();
          const nextDeliveryId = existing.id_address_delivery || firstAddressId;
          const nextInvoiceId = existing.id_address_invoice || nextDeliveryId;
          const previousDeliveryId = existing.id_address_delivery || 0;

          await pool.execute(
            `
              UPDATE \`${config.prefix}cart\`
              SET id_address_delivery = ?, id_address_invoice = ?, date_upd = ?
              WHERE id_cart = ?
            `,
            [nextDeliveryId, nextInvoiceId, this.formatDate(new Date()), existing.id_cart]
          );

          if (previousDeliveryId !== nextDeliveryId) {
            await pool.execute(
              `
                UPDATE \`${config.prefix}cart_product\`
                SET id_address_delivery = ?
                WHERE id_cart = ?
                  AND id_address_delivery IN (?, 0)
              `,
              [nextDeliveryId, existing.id_cart, previousDeliveryId]
            );
          }

          return {
            ...existing,
            id_address_delivery: nextDeliveryId,
            id_address_invoice: nextInvoiceId
          };
        }
      }

      return existing;
    }

    const firstAddressId = await this.findFirstAddressId(customerId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const now = this.formatDate(new Date());

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO \`${config.prefix}cart\` (
          id_shop_group,
          id_shop,
          id_carrier,
          delivery_option,
          id_lang,
          id_address_delivery,
          id_address_invoice,
          id_currency,
          id_customer,
          id_guest,
          secure_key,
          recyclable,
          gift,
          mobile_theme,
          allow_seperated_package,
          date_add,
          date_upd
        ) VALUES (?, ?, 0, '', ?, ?, ?, ?, ?, 0, ?, 0, 0, 0, 0, ?, ?)
      `,
      [
        context.defaultShopGroupId,
        context.defaultShopId,
        customer.id_lang || context.defaultLanguageId,
        firstAddressId ?? 0,
        firstAddressId ?? 0,
        context.defaultCurrencyId,
        customerId,
        customer.secure_key || "-1",
        now,
        now
      ]
    );

    return {
      id_cart: result.insertId,
      id_address_delivery: firstAddressId ?? 0,
      id_address_invoice: firstAddressId ?? 0,
      id_lang: customer.id_lang || context.defaultLanguageId,
      id_currency: context.defaultCurrencyId
    } satisfies CartRow;
  }

  private async findCurrentCart(customerId: number): Promise<CartRow | null> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT cart.id_cart, cart.id_address_delivery, cart.id_address_invoice, cart.id_lang, cart.id_currency
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

  private async listAddresses(customerId: number, cart?: CartRow): Promise<Address[]> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          address.id_address,
          address.alias,
          address.firstname,
          address.lastname,
          address.company,
          address.address1,
          address.address2,
          address.city,
          address.postcode,
          address.phone,
          address.phone_mobile,
          address.id_country,
          country_lang.name AS country_name,
          country.iso_code AS country_iso_code,
          address.id_state,
          state.name AS state_name
        FROM \`${config.prefix}address\` address
        INNER JOIN \`${config.prefix}country\` country
          ON country.id_country = address.id_country
        INNER JOIN \`${config.prefix}country_lang\` country_lang
          ON country_lang.id_country = country.id_country
          AND country_lang.id_lang = ?
        LEFT JOIN \`${config.prefix}state\` state
          ON state.id_state = address.id_state
        WHERE address.id_customer = ?
          AND address.deleted = 0
          AND address.active = 1
        ORDER BY address.date_upd DESC, address.id_address DESC
      `,
      [context.defaultLanguageId, customerId]
    );

    return (rows as AddressRow[]).map((row) => ({
      id: String(row.id_address),
      alias: row.alias,
      firstName: row.firstname,
      lastName: row.lastname,
      company: this.optionalText(row.company),
      address1: row.address1,
      address2: this.optionalText(row.address2),
      city: row.city,
      postcode: this.optionalText(row.postcode),
      phone: this.optionalText(row.phone),
      phoneMobile: this.optionalText(row.phone_mobile),
      countryId: String(row.id_country),
      countryName: row.country_name,
      countryIsoCode: row.country_iso_code,
      stateId: row.id_state ? String(row.id_state) : undefined,
      stateName: this.optionalText(row.state_name),
      isDeliverySelected: Boolean(cart?.id_address_delivery && cart.id_address_delivery === row.id_address),
      isInvoiceSelected: Boolean(cart?.id_address_invoice && cart.id_address_invoice === row.id_address)
    }));
  }

  private async resolveCartProductTarget(productId: string): Promise<ProductTargetRow> {
    const parsedProductId = this.parseId(productId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          product.id_product,
          COALESCE(product.cache_default_attribute, default_attribute.id_product_attribute, 0) AS id_product_attribute
        FROM \`${config.prefix}product\` product
        INNER JOIN \`${config.prefix}product_shop\` product_shop
          ON product_shop.id_product = product.id_product
          AND product_shop.id_shop = ?
        LEFT JOIN \`${config.prefix}product_attribute_shop\` default_attribute
          ON default_attribute.id_product = product.id_product
          AND default_attribute.id_shop = ?
          AND default_attribute.default_on = 1
        WHERE product.id_product = ?
          AND product.state = 1
          AND product_shop.active = 1
          AND product_shop.available_for_order = 1
        LIMIT 1
      `,
      [context.defaultShopId, context.defaultShopId, parsedProductId]
    );

    const target = rows[0] as ProductTargetRow | undefined;

    if (!target) {
      throw new Error("Product is not available for the cart.");
    }

    return target;
  }

  private async prepareAddressInput(input: AddressInput) {
    const countries = await this.listCountries();
    const country = countries.find((entry) => entry.id === input.countryId);

    if (!country) {
      throw new Error("Country is not available.");
    }

    const stateId = input.stateId && input.stateId.trim() ? this.parseId(input.stateId) : null;

    if (country.containsStates && !stateId) {
      throw new Error("State is required for the selected country.");
    }

    if (country.needsZipCode && !input.postcode?.trim()) {
      throw new Error("Postal code is required for the selected country.");
    }

    if (stateId) {
      const states = await this.listStates(country.id);
      const hasState = states.some((state) => state.id === String(stateId));

      if (!hasState) {
        throw new Error("State is not valid for the selected country.");
      }
    }

    return {
      alias: input.alias.trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      company: this.nullIfEmpty(input.company),
      address1: input.address1.trim(),
      address2: this.nullIfEmpty(input.address2),
      city: input.city.trim(),
      postcode: this.nullIfEmpty(input.postcode),
      phone: this.nullIfEmpty(input.phone),
      phoneMobile: this.nullIfEmpty(input.phoneMobile),
      countryId: this.parseId(input.countryId),
      stateId: country.containsStates ? stateId : null
    };
  }

  private async requireOwnedAddress(customerId: number, addressId: string) {
    const parsedAddressId = this.parseId(addressId);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_address, id_customer
        FROM \`${config.prefix}address\`
        WHERE id_address = ?
          AND id_customer = ?
          AND deleted = 0
          AND active = 1
        LIMIT 1
      `,
      [parsedAddressId, customerId]
    );

    const address = rows[0] as OwnedAddressRow | undefined;

    if (!address) {
      throw new Error("Address not found.");
    }

    return address;
  }

  private async requireCustomer(customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_customer, secure_key, id_lang, firstname, lastname, email
        FROM \`${config.prefix}customer\`
        WHERE id_customer = ?
          AND deleted = 0
          AND active = 1
          AND is_guest = 0
        LIMIT 1
      `,
      [customerId]
    );

    const customer = rows[0] as CustomerRow | undefined;

    if (!customer) {
      throw new Error("Customer was not found.");
    }

    return customer;
  }

  private async findFirstAddressId(customerId: number, excludedAddressId?: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const params: number[] = [customerId];
    const exclusionClause = excludedAddressId ? "AND id_address != ?" : "";

    if (excludedAddressId) {
      params.push(excludedAddressId);
    }

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_address
        FROM \`${config.prefix}address\`
        WHERE id_customer = ?
          AND deleted = 0
          AND active = 1
          ${exclusionClause}
        ORDER BY date_upd DESC, id_address DESC
        LIMIT 1
      `,
      params
    );

    const firstId = rows[0]?.id_address;
    return typeof firstId === "number" ? firstId : null;
  }

  private async touchCart(cartId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();

    await pool.execute(
      `
        UPDATE \`${config.prefix}cart\`
        SET date_upd = ?
        WHERE id_cart = ?
      `,
      [this.formatDate(new Date()), cartId]
    );
  }

  private parseId(value: string) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error("Invalid identifier.");
    }

    return parsed;
  }

  private optionalText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private nullIfEmpty(value: string | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeCopy(value: string | null | undefined) {
    if (!value) {
      return undefined;
    }

    const text = value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&#0*39;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();

    return text || undefined;
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }
}
