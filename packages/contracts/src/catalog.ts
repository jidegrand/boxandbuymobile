import { z } from "zod";

export const sellerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  shopName: z.string().optional()
});

export const categorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  productCount: z.number().int().nonnegative().optional()
});

export const productSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price: z.number(),
  currencyCode: z.string().default("USD"),
  imageUrl: z.string().url().optional(),
  inStock: z.boolean().default(true),
  stockQuantity: z.number().int().nonnegative().optional(),
  shortDescription: z.string().optional(),
  seller: sellerSummarySchema.optional(),
  category: categorySummarySchema.optional()
});

export const productDetailSchema = productSummarySchema.extend({
  description: z.string().optional(),
  imageUrls: z.array(z.string().url()).default([])
});

export const catalogHomeResponseSchema = z.object({
  featuredProducts: z.array(productSummarySchema),
  categories: z.array(categorySummarySchema)
});

export const productListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().regex(/^\d+$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20)
});

export const paginatedProductsSchema = z.object({
  items: z.array(productSummarySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type SellerSummary = z.infer<typeof sellerSummarySchema>;
export type CategorySummary = z.infer<typeof categorySummarySchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;
export type CatalogHomeResponse = z.infer<typeof catalogHomeResponseSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type PaginatedProducts = z.infer<typeof paginatedProductsSchema>;
