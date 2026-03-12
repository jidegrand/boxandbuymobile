import type {
  CatalogHomeResponse,
  CategorySummary,
  PaginatedProducts,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
  SellerSummary
} from "@boxandbuy/contracts";

import mysql from "mysql2/promise";

import {
  buildPrestashopImageUrl,
  getPrestashopConfig,
  getPrestashopContext,
  getPrestashopPool,
  type PrestashopContextValues
} from "./prestashop-context";

const FEATURED_PRODUCT_LIMIT = 6;
const SELLER_VERIFICATION_APPROVED = 2;

type ProductRow = {
  id_product: number;
  reference: string | null;
  price: string | number;
  category_id: number | null;
  name: string;
  link_rewrite: string | null;
  description: string | null;
  description_short: string | null;
  quantity: string | number | null;
  out_of_stock: string | number | null;
  cover_image_id: number | null;
  seller_id: number | null;
  seller_shop_name: string | null;
  seller_firstname: string | null;
  seller_lastname: string | null;
  category_name: string | null;
  category_slug: string | null;
};

type CategoryRow = {
  id_category: number;
  name: string;
  link_rewrite: string | null;
  product_count: string | number;
};

type ImageRow = {
  id_image: number;
};

export class PrestashopCatalogService {
  async getHome(): Promise<CatalogHomeResponse> {
    const [featuredProducts, categories] = await Promise.all([
      this.listProducts({
        page: 1,
        pageSize: FEATURED_PRODUCT_LIMIT
      }),
      this.listCategories(FEATURED_PRODUCT_LIMIT)
    ]);

    return {
      featuredProducts: featuredProducts.items,
      categories
    };
  }

  async listProducts(query: ProductListQuery): Promise<PaginatedProducts> {
    const context = await getPrestashopContext();
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const page = Math.max(query.page, 1);
    const pageSize = Math.min(Math.max(query.pageSize, 1), 50);
    const offset = (page - 1) * pageSize;
    const { clause, params } = this.buildProductFilters(query, config.prefix);

    const productJoins = this.getProductJoins(config.prefix);
    const countSql = `
      SELECT COUNT(DISTINCT p.id_product) AS total
      FROM \`${config.prefix}product\` p
      INNER JOIN \`${config.prefix}product_shop\` product_shop
        ON product_shop.id_product = p.id_product
        AND product_shop.id_shop = ?
      INNER JOIN \`${config.prefix}product_lang\` product_lang
        ON product_lang.id_product = p.id_product
        AND product_lang.id_lang = ?
        AND product_lang.id_shop = ?
      ${productJoins}
      WHERE p.state = 1
        AND product_shop.active = 1
        AND product_shop.visibility IN ('both', 'catalog')
        ${clause}
    `;

    const listSql = `
      SELECT
        p.id_product,
        p.reference,
        product_shop.price,
        product_shop.id_category_default AS category_id,
        product_lang.name,
        product_lang.link_rewrite,
        product_lang.description,
        product_lang.description_short,
        COALESCE(stock.quantity, 0) AS quantity,
        COALESCE(stock.out_of_stock, 0) AS out_of_stock,
        cover.id_image AS cover_image_id,
        seller.id_seller AS seller_id,
        seller_lang.shop_name AS seller_shop_name,
        seller_customer.firstname AS seller_firstname,
        seller_customer.lastname AS seller_lastname,
        category_lang.name AS category_name,
        category_lang.link_rewrite AS category_slug
      FROM \`${config.prefix}product\` p
      INNER JOIN \`${config.prefix}product_shop\` product_shop
        ON product_shop.id_product = p.id_product
        AND product_shop.id_shop = ?
      INNER JOIN \`${config.prefix}product_lang\` product_lang
        ON product_lang.id_product = p.id_product
        AND product_lang.id_lang = ?
        AND product_lang.id_shop = ?
      ${productJoins}
      WHERE p.state = 1
        AND product_shop.active = 1
        AND product_shop.visibility IN ('both', 'catalog')
        ${clause}
      ORDER BY product_shop.date_add DESC, p.id_product DESC
      LIMIT ? OFFSET ?
    `;

    const baseParams = [
      context.defaultShopId,
      context.defaultLanguageId,
      context.defaultShopId,
      context.defaultShopId,
      SELLER_VERIFICATION_APPROVED,
      context.defaultLanguageId,
      context.defaultLanguageId,
      context.defaultShopId
    ];

    const [[countRows], [listRows]] = await Promise.all([
      pool.execute<mysql.RowDataPacket[]>(countSql, [...baseParams, ...params]),
      pool.execute<mysql.RowDataPacket[]>(listSql, [...baseParams, ...params, pageSize, offset])
    ]);

    const total = Number.parseInt(String(countRows[0]?.total ?? "0"), 10) || 0;
    const items = await Promise.all(
      (listRows as ProductRow[]).map((row) => this.mapProductSummary(row, context))
    );

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 0
    };
  }

  async getProductById(productId: string): Promise<ProductDetail | null> {
    const parsedId = Number.parseInt(productId, 10);

    if (!Number.isFinite(parsedId) || parsedId < 1) {
      return null;
    }

    const context = await getPrestashopContext();
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const productJoins = this.getProductJoins(config.prefix);
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          p.id_product,
          p.reference,
          product_shop.price,
          product_shop.id_category_default AS category_id,
          product_lang.name,
          product_lang.link_rewrite,
          product_lang.description,
          product_lang.description_short,
          COALESCE(stock.quantity, 0) AS quantity,
          COALESCE(stock.out_of_stock, 0) AS out_of_stock,
          cover.id_image AS cover_image_id,
          seller.id_seller AS seller_id,
          seller_lang.shop_name AS seller_shop_name,
          seller_customer.firstname AS seller_firstname,
          seller_customer.lastname AS seller_lastname,
          category_lang.name AS category_name,
          category_lang.link_rewrite AS category_slug
        FROM \`${config.prefix}product\` p
        INNER JOIN \`${config.prefix}product_shop\` product_shop
          ON product_shop.id_product = p.id_product
          AND product_shop.id_shop = ?
        INNER JOIN \`${config.prefix}product_lang\` product_lang
          ON product_lang.id_product = p.id_product
          AND product_lang.id_lang = ?
          AND product_lang.id_shop = ?
        ${productJoins}
        WHERE p.id_product = ?
          AND p.state = 1
          AND product_shop.active = 1
          AND product_shop.visibility IN ('both', 'catalog')
        LIMIT 1
      `,
      [
        context.defaultShopId,
        context.defaultLanguageId,
        context.defaultShopId,
        context.defaultShopId,
        SELLER_VERIFICATION_APPROVED,
        context.defaultLanguageId,
        context.defaultLanguageId,
        context.defaultShopId,
        parsedId
      ]
    );

    const product = rows[0] as ProductRow | undefined;

    if (!product) {
      return null;
    }

    const [imageRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_image
        FROM \`${config.prefix}image\`
        WHERE id_product = ?
        ORDER BY cover DESC, position ASC, id_image ASC
      `,
      [parsedId]
    );

    const summary = await this.mapProductSummary(product, context);
    const imageUrls = await Promise.all(
      (imageRows as ImageRow[]).map((row) => buildPrestashopImageUrl(row.id_image, "large_default"))
    );

    return {
      ...summary,
      description: this.normalizeCopy(product.description),
      imageUrls
    };
  }

  private async listCategories(limit: number) {
    const context = await getPrestashopContext();
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          category.id_category,
          category_lang.name,
          category_lang.link_rewrite,
          COUNT(DISTINCT product.id_product) AS product_count
        FROM \`${config.prefix}category\` category
        INNER JOIN \`${config.prefix}category_lang\` category_lang
          ON category_lang.id_category = category.id_category
          AND category_lang.id_lang = ?
          AND category_lang.id_shop = ?
        INNER JOIN \`${config.prefix}category_product\` category_product
          ON category_product.id_category = category.id_category
        INNER JOIN \`${config.prefix}product\` product
          ON product.id_product = category_product.id_product
          AND product.state = 1
        INNER JOIN \`${config.prefix}product_shop\` product_shop
          ON product_shop.id_product = product.id_product
          AND product_shop.id_shop = ?
          AND product_shop.active = 1
          AND product_shop.visibility IN ('both', 'catalog')
        WHERE category.active = 1
          AND category.id_category NOT IN (1, ?)
        GROUP BY category.id_category, category_lang.name, category_lang.link_rewrite
        ORDER BY product_count DESC, category_lang.name ASC
        LIMIT ?
      `,
      [
        context.defaultLanguageId,
        context.defaultShopId,
        context.defaultShopId,
        context.homeCategoryId,
        limit
      ]
    );

    return (rows as CategoryRow[]).map((row) => ({
      id: String(row.id_category),
      name: row.name,
      slug: row.link_rewrite ?? undefined,
      productCount: Number.parseInt(String(row.product_count ?? "0"), 10) || 0
    } satisfies CategorySummary));
  }

  private buildProductFilters(query: ProductListQuery, prefix: string) {
    const params: Array<string | number> = [];
    const filters: string[] = [];

    if (query.search) {
      const search = `%${query.search}%`;
      filters.push("(product_lang.name LIKE ? OR p.reference LIKE ? OR product_lang.description_short LIKE ?)");
      params.push(search, search, search);
    }

    if (query.categoryId) {
      filters.push(
        `EXISTS (
          SELECT 1
          FROM \`${prefix}category_product\` category_product_filter
          WHERE category_product_filter.id_product = p.id_product
            AND category_product_filter.id_category = ?
        )`
      );
      params.push(Number.parseInt(query.categoryId, 10));
    }

    return {
      clause: filters.length > 0 ? `AND ${filters.join(" AND ")}` : "",
      params
    };
  }

  private getProductJoins(prefix: string) {
    return `
      LEFT JOIN \`${prefix}stock_available\` stock
        ON stock.id_product = p.id_product
        AND stock.id_product_attribute = 0
        AND stock.id_shop = ?
      LEFT JOIN \`${prefix}image\` cover
        ON cover.id_product = p.id_product
        AND cover.cover = 1
      LEFT JOIN (
        SELECT id_product, MAX(id_customer) AS id_customer
        FROM \`${prefix}ets_mp_seller_product\`
        WHERE active = 1
          AND approved = 1
        GROUP BY id_product
      ) seller_product
        ON seller_product.id_product = p.id_product
      LEFT JOIN \`${prefix}customer\` seller_customer
        ON seller_customer.id_customer = seller_product.id_customer
      LEFT JOIN \`${prefix}ets_mp_seller\` seller
        ON seller.id_customer = seller_customer.id_customer
        AND seller.active = 1
        AND seller.verification_status = ?
        AND (
          seller.verification_expires_at IS NULL
          OR seller.verification_expires_at = '0000-00-00 00:00:00'
          OR seller.verification_expires_at > NOW()
        )
      LEFT JOIN \`${prefix}ets_mp_seller_lang\` seller_lang
        ON seller_lang.id_seller = seller.id_seller
        AND seller_lang.id_lang = ?
      LEFT JOIN \`${prefix}category_lang\` category_lang
        ON category_lang.id_category = product_shop.id_category_default
        AND category_lang.id_lang = ?
        AND category_lang.id_shop = ?
    `;
  }

  private async mapProductSummary(row: ProductRow, context: PrestashopContextValues): Promise<ProductSummary> {
    const stockQuantity = Number.parseInt(String(row.quantity ?? "0"), 10) || 0;
    const outOfStock = Number.parseInt(String(row.out_of_stock ?? "0"), 10) || 0;
    const seller = this.mapSeller(row);
    const category =
      row.category_name &&
      row.category_id &&
      row.category_id !== context.homeCategoryId &&
      row.category_id !== 1
      ? {
          id: String(row.category_id),
          name: row.category_name,
          slug: row.category_slug ?? undefined
        }
      : undefined;

    return {
      id: String(row.id_product),
      name: row.name,
      slug: row.link_rewrite ?? undefined,
      sku: row.reference ?? undefined,
      price: Number.parseFloat(String(row.price ?? "0")) || 0,
      currencyCode: context.currencyCode,
      imageUrl: row.cover_image_id ? await buildPrestashopImageUrl(row.cover_image_id, "home_default") : undefined,
      inStock:
        stockQuantity > 0 ||
        outOfStock === 1 ||
        (outOfStock === 2 && context.allowOutOfStockOrders),
      stockQuantity,
      shortDescription: this.normalizeCopy(row.description_short),
      seller,
      category
    };
  }

  private mapSeller(row: ProductRow): SellerSummary | undefined {
    if (!row.seller_id) {
      return undefined;
    }

    const fallbackName = [row.seller_firstname, row.seller_lastname].filter(Boolean).join(" ").trim();
    const name = fallbackName || row.seller_shop_name?.trim();

    if (!name) {
      return undefined;
    }

    return {
      id: String(row.seller_id),
      name,
      shopName: row.seller_shop_name?.trim() || undefined
    };
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
}
