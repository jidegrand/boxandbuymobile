import { z } from "zod";

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional()
});

export const idParamSchema = z.object({
  id: z.string().min(1)
});

export type ApiError = z.infer<typeof apiErrorSchema>;

