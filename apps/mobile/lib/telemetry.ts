import type { PushTokenRegistrationInput, TelemetryEventInput } from "@boxandbuy/contracts";

import { env } from "./env";
import { getAppRuntimeInfo } from "./app-runtime";
import { useAuthStore } from "../store/auth.store";

type TelemetryPayload = Omit<TelemetryEventInput, "metadata"> & {
  metadata?: Record<string, string>;
};

function buildHeaders() {
  const accessToken = useAuthStore.getState().accessToken;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

export async function trackEvent(payload: TelemetryPayload) {
  const runtime = getAppRuntimeInfo();

  try {
    await fetch(`${env.apiBaseUrl}/api/mobile/telemetry/events`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        ...runtime,
        ...payload
      } satisfies TelemetryEventInput)
    });
  } catch {
    // Telemetry failures should never interrupt the user flow.
  }
}

export async function recordAppError(error: unknown, metadata?: Record<string, string>) {
  const message = error instanceof Error ? error.message : "Unknown mobile error";

  await trackEvent({
    name: "app_error",
    level: "error",
    message,
    metadata
  });
}

export async function recordApiError(path: string, message: string, status?: number) {
  await trackEvent({
    name: "api_error",
    level: "error",
    message,
    route: path,
    metadata: status ? { status: String(status) } : undefined
  });
}

export async function registerPushToken(payload: Omit<PushTokenRegistrationInput, "appVersion" | "buildVersion" | "appEnv">) {
  const runtime = getAppRuntimeInfo();

  try {
    await fetch(`${env.apiBaseUrl}/api/mobile/telemetry/push-token`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        ...payload,
        appVersion: runtime.appVersion,
        buildVersion: runtime.buildVersion,
        appEnv: runtime.appEnv
      } satisfies PushTokenRegistrationInput)
    });
  } catch {
    // Push token registration is best-effort during Sprint 10.
  }
}
