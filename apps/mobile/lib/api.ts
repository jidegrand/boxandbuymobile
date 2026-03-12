import type {
  AuthSession,
  LoginPayload,
  LogoutPayload,
  MeResponse,
  RefreshPayload,
  RegisterPayload
} from "@boxandbuy/contracts";

import { env } from "./env";
import { useAuthStore } from "../store/auth.store";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;

  return fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });
}

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${env.apiBaseUrl}/api/mobile/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken } satisfies RefreshPayload)
  });

  if (!response.ok) {
    await useAuthStore.getState().clearSession();
    return false;
  }

  const session = (await response.json()) as AuthSession;
  await useAuthStore.getState().setSession(session);
  return true;
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  let response = await requestOnce<T>(path, options);

  if (response.status === 401 && retry && (await tryRefreshSession())) {
    response = await requestOnce<T>(path, options);
  }

  if (!response.ok) {
    const fallback = { error: `Request failed: ${response.status}` };
    const payload = await response.json().catch(() => fallback);
    throw new Error(payload.error ?? fallback.error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSession() {
    return request<MeResponse>("/api/mobile/auth/me");
  },
  async login(payload: LoginPayload) {
    const session = await request<AuthSession>("/api/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await useAuthStore.getState().setSession(session);
    return session;
  },
  async register(payload: RegisterPayload) {
    const session = await request<AuthSession>("/api/mobile/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await useAuthStore.getState().setSession(session);
    return session;
  },
  async logout() {
    const refreshToken = useAuthStore.getState().refreshToken;
    const payload: LogoutPayload = refreshToken ? { refreshToken } : {};

    try {
      await request<void>("/api/mobile/auth/logout", {
        method: "POST",
        body: JSON.stringify(payload)
      }, false);
    } finally {
      await useAuthStore.getState().clearSession();
    }
  }
};
