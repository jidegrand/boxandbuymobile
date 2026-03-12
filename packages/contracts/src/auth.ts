import { z } from "zod";

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().optional(),
  role: z.string().optional()
});

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.int().positive()
});

export const authSessionSchema = z.object({
  tokens: authTokensSchema,
  user: sessionUserSchema
});

export const loginPayloadSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

export const registerPayloadSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

export const refreshPayloadSchema = z.object({
  refreshToken: z.string().min(1)
});

export const logoutPayloadSchema = z.object({
  refreshToken: z.string().min(1).optional()
});

export const meResponseSchema = z.object({
  user: sessionUserSchema
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;
export type RefreshPayload = z.infer<typeof refreshPayloadSchema>;
export type LogoutPayload = z.infer<typeof logoutPayloadSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
