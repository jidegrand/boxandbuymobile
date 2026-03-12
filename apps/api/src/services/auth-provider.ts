import type { LoginPayload, RegisterPayload, SessionUser } from "@boxandbuy/contracts";

export class AuthProviderError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_credentials" | "inactive_account" | "email_exists" | "not_implemented" | "unexpected"
  ) {
    super(message);
    this.name = "AuthProviderError";
  }
}

export interface AuthProvider {
  login(payload: LoginPayload): Promise<SessionUser | null>;
  register(payload: RegisterPayload): Promise<SessionUser>;
  getUserById(userId: string): Promise<SessionUser | null>;
}
