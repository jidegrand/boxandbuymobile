import { z } from "zod";

export const businessApplicationStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const termsApplicationStatusSchema = z.enum(["pending", "approved", "rejected", "revoked"]);

export const businessApplicationSchema = z.object({
  id: z.string(),
  status: businessApplicationStatusSchema,
  companyName: z.string(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
  applicantFirstName: z.string().optional(),
  applicantLastName: z.string().optional(),
  applicantEmail: z.string().email().optional(),
  adminNote: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  decidedAt: z.string().optional()
});

export const termsApplicationSchema = z.object({
  id: z.string(),
  status: termsApplicationStatusSchema,
  requestedTermsDays: z.number().int().positive(),
  approvedTermsDays: z.number().int().positive().optional(),
  customerNote: z.string().optional(),
  adminNote: z.string().optional(),
  submittedAt: z.string(),
  updatedAt: z.string(),
  decidedAt: z.string().optional()
});

export const businessOverviewSchema = z.object({
  accountActive: z.boolean(),
  isBusinessCustomer: z.boolean(),
  canSubmitApplication: z.boolean(),
  canApplyForTerms: z.boolean(),
  approvedTermsDays: z.number().int().nonnegative(),
  application: businessApplicationSchema.optional(),
  termsApplication: termsApplicationSchema.optional()
});

export const businessActionResponseSchema = z.object({
  message: z.string(),
  overview: businessOverviewSchema.optional()
});

export const guestBusinessApplicationResponseSchema = z.object({
  message: z.string()
});

export const businessApplicationInputSchema = z.object({
  companyName: z.string().trim().min(1).max(255),
  taxId: z.string().trim().max(128).optional().or(z.literal("")),
  phone: z.string().trim().max(64).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const termsApplicationInputSchema = z.object({
  requestedTermsDays: z.union([z.literal(15), z.literal(30)]),
  customerNote: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const guestBusinessApplicationInputSchema = z.object({
  firstName: z.string().trim().min(1).max(128),
  lastName: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(255),
  companyName: z.string().trim().min(1).max(255),
  taxId: z.string().trim().max(128).optional().or(z.literal("")),
  phone: z.string().trim().max(64).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
  passwordConfirmation: z.string().min(8).max(72)
}).superRefine((value, context) => {
  if (value.password !== value.passwordConfirmation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["passwordConfirmation"],
      message: "Password confirmation does not match."
    });
  }
});

export type BusinessApplicationStatus = z.infer<typeof businessApplicationStatusSchema>;
export type TermsApplicationStatus = z.infer<typeof termsApplicationStatusSchema>;
export type BusinessApplication = z.infer<typeof businessApplicationSchema>;
export type TermsApplication = z.infer<typeof termsApplicationSchema>;
export type BusinessOverview = z.infer<typeof businessOverviewSchema>;
export type BusinessActionResponse = z.infer<typeof businessActionResponseSchema>;
export type GuestBusinessApplicationResponse = z.infer<typeof guestBusinessApplicationResponseSchema>;
export type BusinessApplicationInput = z.infer<typeof businessApplicationInputSchema>;
export type TermsApplicationInput = z.infer<typeof termsApplicationInputSchema>;
export type GuestBusinessApplicationInput = z.infer<typeof guestBusinessApplicationInputSchema>;
