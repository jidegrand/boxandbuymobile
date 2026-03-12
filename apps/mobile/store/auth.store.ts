import type { SessionUser } from "@boxandbuy/contracts";
import type { AuthSession } from "@boxandbuy/contracts";

import { create } from "zustand";

import { secureStorage } from "../lib/storage";

const ACCESS_TOKEN_KEY = "auth.accessToken";
const REFRESH_TOKEN_KEY = "auth.refreshToken";

type AuthState = {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  hydrate: () => Promise<void>;
  setSession: (session: AuthSession) => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  async hydrate() {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY)
    ]);

    set({
      hydrated: true,
      accessToken,
      refreshToken,
      user: null
    });
  },
  async setSession(session) {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken)
    ]);

    set({
      hydrated: true,
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
      user: session.user
    });
  },
  setUser(user) {
    set({ user });
  },
  async clearSession() {
    await Promise.all([
      secureStorage.removeItem(ACCESS_TOKEN_KEY),
      secureStorage.removeItem(REFRESH_TOKEN_KEY)
    ]);

    set({
      hydrated: true,
      accessToken: null,
      refreshToken: null,
      user: null
    });
  }
}));
