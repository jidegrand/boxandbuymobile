import { z } from "zod";

export const rfqStatusSchema = z.enum(["submitted", "approved", "rejected", "expired"]);

export const rfqItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productAttributeId: z.string().optional(),
  name: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
  lineTotal: z.number()
});

export const rfqSummarySchema = z.object({
  id: z.string(),
  cartId: z.string(),
  reference: z.string(),
  status: rfqStatusSchema,
  currencyCode: z.string().default("USD"),
  totalAmount: z.number(),
  itemCount: z.number().int().nonnegative(),
  customerNote: z.string().optional(),
  adminNote: z.string().optional(),
  submittedAt: z.string(),
  reviewedAt: z.string().optional(),
  quoteExpiresAt: z.string().optional(),
  quoteDownloadable: z.boolean().default(false),
  checkoutAvailable: z.boolean().default(false),
  downloadUrl: z.string().url().optional(),
  checkoutUrl: z.string().url().optional()
});

export const rfqDetailSchema = rfqSummarySchema.extend({
  items: z.array(rfqItemSchema)
});

export const rfqListResponseSchema = z.object({
  items: z.array(rfqSummarySchema)
});

export const currentCartRfqResponseSchema = z.object({
  rfq: rfqSummarySchema.nullable()
});

export const submitRfqInputSchema = z.object({
  customerNote: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const submitRfqResponseSchema = z.object({
  created: z.boolean(),
  message: z.string(),
  rfq: rfqSummarySchema
});

export type RfqStatus = z.infer<typeof rfqStatusSchema>;
export type RfqItem = z.infer<typeof rfqItemSchema>;
export type RfqSummary = z.infer<typeof rfqSummarySchema>;
export type RfqDetail = z.infer<typeof rfqDetailSchema>;
export type RfqListResponse = z.infer<typeof rfqListResponseSchema>;
export type CurrentCartRfqResponse = z.infer<typeof currentCartRfqResponseSchema>;
export type SubmitRfqInput = z.infer<typeof submitRfqInputSchema>;
export type SubmitRfqResponse = z.infer<typeof submitRfqResponseSchema>;
