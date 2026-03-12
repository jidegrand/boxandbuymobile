import type { LoginPayload, RegisterPayload, SessionUser } from "@boxandbuy/contracts";

export interface AuthProvider {
  login(payload: LoginPayload): Promise<SessionUser | null>;
  register(payload: RegisterPayload): Promise<SessionUser>;
  getUserById(userId: string): Promise<SessionUser | null>;
}

