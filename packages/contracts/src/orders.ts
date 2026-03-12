import { z } from "zod";

export const orderStatusSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  isPaid: z.boolean().default(false),
  isShipped: z.boolean().default(false)
});

export const orderLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productAttributeId: z.string().optional(),
  name: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  imageUrl: z.string().url().optional(),
  productSlug: z.string().optional()
});

export const orderHistoryEntrySchema = z.object({
  id: z.string(),
  stateId: z.string(),
  label: z.string(),
  color: z.string().optional(),
  occurredAt: z.string(),
  isPaid: z.boolean().default(false),
  isShipped: z.boolean().default(false)
});

export const orderSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  placedAt: z.string(),
  currencyCode: z.string().default("USD"),
  itemCount: z.number().int().nonnegative(),
  subtotalAmount: z.number(),
  shippingAmount: z.number(),
  totalAmount: z.number(),
  paymentMethod: z.string().optional(),
  trackingNumber: z.string().optional(),
  invoiceUrl: z.string().url().optional(),
  status: orderStatusSchema
});

export const ordersResponseSchema = z.object({
  orders: z.array(orderSummarySchema)
});

export const orderDetailSchema = orderSummarySchema.extend({
  isValid: z.boolean().default(false),
  paymentModule: z.string().optional(),
  confirmationUrl: z.string().url().optional(),
  lines: z.array(orderLineSchema),
  history: z.array(orderHistoryEntrySchema)
});

export const checkoutSessionStatusSchema = z.enum(["ready", "empty_cart", "missing_addresses"]);

export const checkoutSessionSchema = z.object({
  mode: z.literal("web_redirect"),
  status: checkoutSessionStatusSchema,
  cartId: z.string().optional(),
  currencyCode: z.string().default("USD"),
  itemCount: z.number().int().nonnegative(),
  subtotalAmount: z.number(),
  estimatedTotalAmount: z.number(),
  requiresStorefrontLogin: z.boolean().default(true),
  checkoutReady: z.boolean().default(false),
  checkoutUrl: z.string().url().optional(),
  message: z.string()
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderLine = z.infer<typeof orderLineSchema>;
export type OrderHistoryEntry = z.infer<typeof orderHistoryEntrySchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export type CheckoutSessionStatus = z.infer<typeof checkoutSessionStatusSchema>;
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>;
