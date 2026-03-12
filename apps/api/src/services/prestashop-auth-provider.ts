import type { LoginPayload, RegisterPayload, SessionUser } from "@boxandbuy/contracts";

import type { AuthProvider } from "./auth-provider";

export class PrestashopAuthProvider implements AuthProvider {
  async login(_payload: LoginPayload): Promise<SessionUser | null> {
    throw new Error("PrestaShop auth provider is not wired yet.");
  }

  async register(_payload: RegisterPayload): Promise<SessionUser> {
    throw new Error("PrestaShop auth provider is not wired yet.");
  }

  async getUserById(_userId: string): Promise<SessionUser | null> {
    throw new Error("PrestaShop auth provider is not wired yet.");
  }
}

