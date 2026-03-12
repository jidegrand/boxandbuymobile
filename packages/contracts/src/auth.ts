import { z } from "zod";

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().optional(),
  role: z.string().optional()
});

export const authSessionSchema = z.object({
  token: z.string(),
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

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

