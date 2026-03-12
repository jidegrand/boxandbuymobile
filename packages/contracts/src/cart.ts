import { z } from "zod";

import { productSummarySchema } from "./catalog";

export const countrySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  isoCode: z.string(),
  containsStates: z.boolean().default(false),
  needsZipCode: z.boolean().default(true)
});

export const stateSummarySchema = z.object({
  id: z.string(),
  countryId: z.string(),
  name: z.string(),
  isoCode: z.string()
});

export const addressSchema = z.object({
  id: z.string(),
  alias: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  postcode: z.string().optional(),
  phone: z.string().optional(),
  phoneMobile: z.string().optional(),
  countryId: z.string(),
  countryName: z.string(),
  countryIsoCode: z.string(),
  stateId: z.string().optional(),
  stateName: z.string().optional(),
  isDeliverySelected: z.boolean().default(false),
  isInvoiceSelected: z.boolean().default(false)
});

export const cartLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productAttributeId: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  product: productSummarySchema
});

export const cartSchema = z.object({
  id: z.string().optional(),
  currencyCode: z.string().default("USD"),
  items: z.array(cartLineSchema),
  totalQuantity: z.number().int().nonnegative(),
  subtotalAmount: z.number(),
  estimatedTotalAmount: z.number(),
  deliveryAddressId: z.string().optional(),
  invoiceAddressId: z.string().optional(),
  checkoutReady: z.boolean().default(false)
});

export const cartResponseSchema = z.object({
  cart: cartSchema,
  addresses: z.array(addressSchema)
});

export const countriesResponseSchema = z.object({
  countries: z.array(countrySummarySchema)
});

export const statesResponseSchema = z.object({
  states: z.array(stateSummarySchema)
});

export const cartItemInputSchema = z.object({
  productId: z.string().regex(/^\d+$/),
  quantity: z.coerce.number().int().positive().max(999)
});

export const cartItemUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(999)
});

export const cartAddressSelectionSchema = z.object({
  deliveryAddressId: z.string().regex(/^\d+$/),
  invoiceAddressId: z.string().regex(/^\d+$/)
});

export const addressInputSchema = z.object({
  alias: z.string().trim().min(1).max(32),
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  company: z.string().trim().max(255).optional().or(z.literal("")),
  address1: z.string().trim().min(1).max(128),
  address2: z.string().trim().max(128).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(64),
  postcode: z.string().trim().max(12).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  phoneMobile: z.string().trim().max(32).optional().or(z.literal("")),
  countryId: z.string().regex(/^\d+$/),
  stateId: z.string().regex(/^\d+$/).optional().or(z.literal("")).optional()
});

export type CountrySummary = z.infer<typeof countrySummarySchema>;
export type StateSummary = z.infer<typeof stateSummarySchema>;
export type Address = z.infer<typeof addressSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type CartResponse = z.infer<typeof cartResponseSchema>;
export type CountriesResponse = z.infer<typeof countriesResponseSchema>;
export type StatesResponse = z.infer<typeof statesResponseSchema>;
export type CartItemInput = z.infer<typeof cartItemInputSchema>;
export type CartItemUpdate = z.infer<typeof cartItemUpdateSchema>;
export type CartAddressSelection = z.infer<typeof cartAddressSelectionSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
