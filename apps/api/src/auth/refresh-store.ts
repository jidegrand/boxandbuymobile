import { randomUUID } from "node:crypto";

type RefreshRecord = {
  userId: string;
  expiresAt: number;
};

export class RefreshStore {
  private readonly tokens = new Map<string, RefreshRecord>();

  constructor(private readonly ttlSeconds: number) {}

  issue(userId: string) {
    const token = randomUUID();
    this.tokens.set(token, {
      userId,
      expiresAt: Date.now() + this.ttlSeconds * 1000
    });
    return token;
  }

  rotate(token: string) {
    const existing = this.tokens.get(token);

    if (!existing || existing.expiresAt <= Date.now()) {
      this.tokens.delete(token);
      return null;
    }

    this.tokens.delete(token);

    return {
      userId: existing.userId,
      refreshToken: this.issue(existing.userId)
    };
  }

  revoke(token: string | undefined) {
    if (!token) {
      return;
    }

    this.tokens.delete(token);
  }
}

