import type { LoginPayload, RegisterPayload, SessionUser } from "@boxandbuy/contracts";

import { randomUUID } from "node:crypto";

import { env } from "../env";
import type { AuthProvider } from "./auth-provider";

type DemoRecord = SessionUser & {
  password: string;
};

export class DemoAuthProvider implements AuthProvider {
  private readonly usersById = new Map<string, DemoRecord>();
  private readonly userIdsByEmail = new Map<string, string>();

  constructor() {
    const seededId = randomUUID();
    const seededRecord: DemoRecord = {
      id: seededId,
      email: env.demoUserEmail,
      name: env.demoUserName,
      role: "buyer",
      password: env.demoUserPassword
    };

    this.usersById.set(seededId, seededRecord);
    this.userIdsByEmail.set(seededRecord.email.toLowerCase(), seededId);
  }

  async login(payload: LoginPayload) {
    const userId = this.userIdsByEmail.get(payload.email.toLowerCase());

    if (!userId) {
      return null;
    }

    const user = this.usersById.get(userId);

    if (!user || user.password !== payload.password) {
      return null;
    }

    return this.toSessionUser(user);
  }

  async register(payload: RegisterPayload) {
    const normalizedEmail = payload.email.toLowerCase();

    if (this.userIdsByEmail.has(normalizedEmail)) {
      throw new Error("A user already exists for this email.");
    }

    const userId = randomUUID();
    const user: DemoRecord = {
      id: userId,
      email: normalizedEmail,
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      role: "buyer",
      password: payload.password
    };

    this.usersById.set(userId, user);
    this.userIdsByEmail.set(normalizedEmail, userId);

    return this.toSessionUser(user);
  }

  async getUserById(userId: string) {
    const user = this.usersById.get(userId);
    return user ? this.toSessionUser(user) : null;
  }

  private toSessionUser(user: DemoRecord): SessionUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }
}

