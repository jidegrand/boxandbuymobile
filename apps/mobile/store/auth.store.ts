import type { SessionUser } from "@boxandbuy/contracts";

import { create } from "zustand";

import { secureStorage } from "../lib/storage";

const TOKEN_KEY = "auth.token";

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: SessionUser | null;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: SessionUser) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  token: null,
  user: null,
  async hydrate() {
    const token = await secureStorage.getItem(TOKEN_KEY);
    set({
      hydrated: true,
      token,
      user: null
    });
  },
  async setSession(token, user) {
    await secureStorage.setItem(TOKEN_KEY, token);
    set({
      hydrated: true,
      token,
      user
    });
  },
  async clearSession() {
    await secureStorage.removeItem(TOKEN_KEY);
    set({
      hydrated: true,
      token: null,
      user: null
    });
  }
}));

