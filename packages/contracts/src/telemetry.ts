import { z } from "zod";

export const telemetryEventNameSchema = z.enum([
  "screen_view",
  "app_error",
  "api_error",
  "notification_permission",
  "push_token_registered",
  "notification_opened",
  "deep_link_opened",
  "network_status",
  "update_status"
]);

export const telemetryEventInputSchema = z.object({
  name: telemetryEventNameSchema,
  route: z.string().trim().min(1).max(255).optional(),
  message: z.string().trim().min(1).max(1000).optional(),
  level: z.enum(["info", "warning", "error"]).default("info"),
  metadata: z.record(z.string(), z.string()).optional(),
  appVersion: z.string().trim().min(1).max(64).optional(),
  buildVersion: z.string().trim().min(1).max(64).optional(),
  appEnv: z.string().trim().min(1).max(64).optional(),
  platform: z.string().trim().min(1).max(32).optional(),
  osVersion: z.string().trim().min(1).max(64).optional(),
  deviceName: z.string().trim().min(1).max(128).optional()
});

export const telemetryEventResponseSchema = z.object({
  accepted: z.literal(true)
});

export const pushTokenRegistrationInputSchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: z.string().trim().min(1).max(32),
  appVersion: z.string().trim().min(1).max(64).optional(),
  buildVersion: z.string().trim().min(1).max(64).optional(),
  appEnv: z.string().trim().min(1).max(64).optional(),
  deviceName: z.string().trim().min(1).max(128).optional()
});

export const pushTokenRegistrationResponseSchema = z.object({
  accepted: z.literal(true)
});

export type TelemetryEventName = z.infer<typeof telemetryEventNameSchema>;
export type TelemetryEventInput = z.infer<typeof telemetryEventInputSchema>;
export type TelemetryEventResponse = z.infer<typeof telemetryEventResponseSchema>;
export type PushTokenRegistrationInput = z.infer<typeof pushTokenRegistrationInputSchema>;
export type PushTokenRegistrationResponse = z.infer<typeof pushTokenRegistrationResponseSchema>;
