import { z } from "zod";

export const sellerSummarySchema = z.object({
  id: z.string(),
  name: z.string()
});

export const productSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  price: z.number(),
  currencyCode: z.string().default("USD"),
  imageUrl: z.string().url().optional(),
  inStock: z.boolean().default(true)
});

export const productDetailSchema = productSummarySchema.extend({
  description: z.string().optional(),
  seller: sellerSummarySchema.optional()
});

export type ProductSummary = z.infer<typeof productSummarySchema>;
export type ProductDetail = z.infer<typeof productDetailSchema>;

