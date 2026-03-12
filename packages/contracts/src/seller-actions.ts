import { z } from "zod";

import { sellerRoleSchema } from "./seller";

const optionalShortText = z.string().trim().max(255).optional();
const optionalLongText = z.string().trim().max(4000).optional();

export const sellerActionPermissionsSchema = z.object({
  canManageProfile: z.boolean(),
  canManageMessages: z.boolean(),
  canRequestPayouts: z.boolean(),
  canViewAuditLog: z.boolean()
});

export const sellerVerificationStatusSchema = z.enum([
  "not_submitted",
  "pending",
  "approved",
  "rejected",
  "expired"
]);

export const sellerProfileSchema = z.object({
  sellerId: z.string(),
  role: sellerRoleSchema,
  displayName: z.string(),
  ownerName: z.string(),
  ownerEmail: z.email().optional(),
  shopName: z.string(),
  shopDescription: z.string(),
  shopAddress: z.string(),
  shopPhone: z.string(),
  vatNumber: optionalShortText,
  bannerUrl: optionalShortText,
  linkFacebook: optionalShortText,
  linkGoogle: optionalShortText,
  linkInstagram: optionalShortText,
  linkTwitter: optionalShortText,
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  vacationNotice: optionalLongText,
  verificationStatus: sellerVerificationStatusSchema,
  verificationExpiresAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const sellerProfileResponseSchema = z.object({
  profile: sellerProfileSchema,
  permissions: sellerActionPermissionsSchema
});

export const sellerProfileUpdateInputSchema = z.object({
  shopName: z.string().trim().min(1).max(255),
  shopDescription: z.string().trim().min(1).max(4000),
  shopAddress: z.string().trim().min(1).max(2000),
  shopPhone: z.string().trim().min(1).max(64),
  vatNumber: optionalShortText,
  bannerUrl: optionalShortText,
  linkFacebook: optionalShortText,
  linkGoogle: optionalShortText,
  linkInstagram: optionalShortText,
  linkTwitter: optionalShortText,
  latitude: z.string().trim().max(64).optional(),
  longitude: z.string().trim().max(64).optional(),
  vacationNotice: optionalLongText
});

export const sellerAuditActionSchema = z.enum([
  "profile_updated",
  "message_replied",
  "payout_requested"
]);

export const sellerAuditEntrySchema = z.object({
  id: z.string(),
  action: sellerAuditActionSchema,
  actorRole: sellerRoleSchema,
  actorName: z.string(),
  summary: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.string()).optional()
});

export const sellerProfileMutationResponseSchema = z.object({
  message: z.string(),
  profile: sellerProfileSchema,
  permissions: sellerActionPermissionsSchema,
  audit: sellerAuditEntrySchema.optional()
});

export const sellerMessageThreadTypeSchema = z.enum(["order", "contact"]);
export const sellerMessageVisibilitySchema = z.enum(["public", "private"]);
export const sellerMessageSenderRoleSchema = z.enum(["customer", "seller", "manager", "employee", "guest"]);

export const sellerMessageThreadSummarySchema = z.object({
  id: z.string(),
  externalId: z.string(),
  type: sellerMessageThreadTypeSchema,
  subject: z.string(),
  preview: z.string().optional(),
  lastMessageAt: z.string(),
  unreadCount: z.number().int().nonnegative(),
  customerName: z.string().optional(),
  customerEmail: z.email().optional(),
  orderReference: z.string().optional()
});

export const sellerMessageSchema = z.object({
  id: z.string(),
  senderName: z.string(),
  senderRole: sellerMessageSenderRoleSchema,
  body: z.string(),
  createdAt: z.string(),
  visibility: sellerMessageVisibilitySchema
});

export const sellerMessageThreadSchema = sellerMessageThreadSummarySchema.extend({
  messages: z.array(sellerMessageSchema)
});

export const sellerMessageThreadsResponseSchema = z.object({
  items: z.array(sellerMessageThreadSummarySchema),
  permissions: sellerActionPermissionsSchema
});

export const sellerMessageThreadResponseSchema = z.object({
  thread: sellerMessageThreadSchema,
  permissions: sellerActionPermissionsSchema
});

export const sellerThreadIdParamSchema = z.object({
  id: z.string().regex(/^(order|contact)-\d+$/)
});

export const sellerMessageReplyInputSchema = z.object({
  message: z.string().trim().min(1).max(1600),
  visibility: sellerMessageVisibilitySchema.optional()
});

export const sellerMessageReplyResponseSchema = z.object({
  message: z.string(),
  thread: sellerMessageThreadSchema,
  permissions: sellerActionPermissionsSchema,
  audit: sellerAuditEntrySchema.optional()
});

export const sellerPayoutStatusSchema = z.enum(["pending", "approved", "declined"]);

export const sellerPayoutMethodFieldSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  type: z.string(),
  required: z.boolean(),
  lastValue: z.string().optional()
});

export const sellerPayoutMethodSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  note: z.string().optional(),
  feeType: z.enum(["fixed", "percent", "none"]),
  feeFixed: z.number(),
  feePercent: z.number(),
  estimatedProcessingDays: z.number().int().nonnegative(),
  supportsMobileSubmission: z.boolean(),
  blockedReason: z.string().optional(),
  fields: z.array(sellerPayoutMethodFieldSchema)
});

export const sellerPayoutRequestSummarySchema = z.object({
  id: z.string(),
  amount: z.number(),
  netAmount: z.number(),
  fee: z.number(),
  status: sellerPayoutStatusSchema,
  paymentMethodName: z.string(),
  requestedAt: z.string(),
  processingDate: z.string(),
  reference: z.string().optional(),
  note: z.string().optional()
});

export const sellerPayoutSummarySchema = z.object({
  availableBalance: z.number(),
  totalCommission: z.number(),
  totalWithdrawn: z.number(),
  minimumAmount: z.number().nullable(),
  maximumAmount: z.number().nullable(),
  verificationStatus: sellerVerificationStatusSchema,
  verificationExpiresAt: z.string().optional(),
  requiresInvoiceUpload: z.boolean(),
  canRequestPayout: z.boolean()
});

export const sellerPayoutOverviewResponseSchema = z.object({
  summary: sellerPayoutSummarySchema,
  methods: z.array(sellerPayoutMethodSchema),
  recentRequests: z.array(sellerPayoutRequestSummarySchema),
  permissions: sellerActionPermissionsSchema
});

export const sellerPayoutRequestInputSchema = z.object({
  paymentMethodId: z.string().trim().min(1),
  amount: z.number().positive(),
  fields: z.record(z.string(), z.string()).optional()
});

export const sellerPayoutRequestResponseSchema = z.object({
  message: z.string(),
  request: sellerPayoutRequestSummarySchema,
  permissions: sellerActionPermissionsSchema,
  audit: sellerAuditEntrySchema.optional()
});

export const sellerAuditLogResponseSchema = z.object({
  items: z.array(sellerAuditEntrySchema),
  permissions: sellerActionPermissionsSchema
});

export type SellerActionPermissions = z.infer<typeof sellerActionPermissionsSchema>;
export type SellerVerificationStatus = z.infer<typeof sellerVerificationStatusSchema>;
export type SellerProfile = z.infer<typeof sellerProfileSchema>;
export type SellerProfileResponse = z.infer<typeof sellerProfileResponseSchema>;
export type SellerProfileUpdateInput = z.infer<typeof sellerProfileUpdateInputSchema>;
export type SellerAuditAction = z.infer<typeof sellerAuditActionSchema>;
export type SellerAuditEntry = z.infer<typeof sellerAuditEntrySchema>;
export type SellerProfileMutationResponse = z.infer<typeof sellerProfileMutationResponseSchema>;
export type SellerMessageThreadType = z.infer<typeof sellerMessageThreadTypeSchema>;
export type SellerMessageVisibility = z.infer<typeof sellerMessageVisibilitySchema>;
export type SellerMessageSenderRole = z.infer<typeof sellerMessageSenderRoleSchema>;
export type SellerMessageThreadSummary = z.infer<typeof sellerMessageThreadSummarySchema>;
export type SellerMessage = z.infer<typeof sellerMessageSchema>;
export type SellerMessageThread = z.infer<typeof sellerMessageThreadSchema>;
export type SellerMessageThreadsResponse = z.infer<typeof sellerMessageThreadsResponseSchema>;
export type SellerMessageThreadResponse = z.infer<typeof sellerMessageThreadResponseSchema>;
export type SellerMessageReplyInput = z.infer<typeof sellerMessageReplyInputSchema>;
export type SellerMessageReplyResponse = z.infer<typeof sellerMessageReplyResponseSchema>;
export type SellerPayoutStatus = z.infer<typeof sellerPayoutStatusSchema>;
export type SellerPayoutMethodField = z.infer<typeof sellerPayoutMethodFieldSchema>;
export type SellerPayoutMethod = z.infer<typeof sellerPayoutMethodSchema>;
export type SellerPayoutRequestSummary = z.infer<typeof sellerPayoutRequestSummarySchema>;
export type SellerPayoutSummary = z.infer<typeof sellerPayoutSummarySchema>;
export type SellerPayoutOverviewResponse = z.infer<typeof sellerPayoutOverviewResponseSchema>;
export type SellerPayoutRequestInput = z.infer<typeof sellerPayoutRequestInputSchema>;
export type SellerPayoutRequestResponse = z.infer<typeof sellerPayoutRequestResponseSchema>;
export type SellerAuditLogResponse = z.infer<typeof sellerAuditLogResponseSchema>;
