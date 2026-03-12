import type { AuthSession, LoginPayload, RegisterPayload } from "@boxandbuy/contracts";

import { env } from "./env";
import { useAuthStore } from "../store/auth.store";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const fallback = { error: `Request failed: ${response.status}` };
    const payload = await response.json().catch(() => fallback);
    throw new Error(payload.error ?? fallback.error);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSession() {
    return request<AuthSession>("/api/mobile/auth/me");
  },
  login(payload: LoginPayload) {
    return request<AuthSession>("/api/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  register(payload: RegisterPayload) {
    return request<AuthSession>("/api/mobile/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

