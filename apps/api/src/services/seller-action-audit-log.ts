import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { SellerAuditAction, SellerAuditEntry as SellerActionAuditEntry, SellerRole } from "@boxandbuy/contracts";

import { env } from "../env";

type PersistedAuditEntry = SellerActionAuditEntry & {
  sellerNumericId: number;
  actorUserId: string;
};

type RecordInput = {
  sellerNumericId: number;
  actorUserId: string;
  actorRole: SellerRole;
  actorName: string;
  action: SellerAuditAction;
  summary: string;
  metadata?: Record<string, string>;
};

export class SellerActionAuditLog {
  constructor(private readonly filePath = env.sellerAuditLogPath) {}

  async record(input: RecordInput): Promise<SellerActionAuditEntry> {
    const entry: PersistedAuditEntry = {
      id: randomBytes(12).toString("hex"),
      sellerNumericId: input.sellerNumericId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorName: input.actorName,
      action: input.action,
      summary: input.summary,
      metadata: input.metadata && Object.keys(input.metadata).length ? input.metadata : undefined,
      createdAt: new Date().toISOString()
    };

    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");

    return this.toPublicEntry(entry);
  }

  async listForSeller(sellerNumericId: number, limit = 25): Promise<SellerActionAuditEntry[]> {
    try {
      const fileContents = await readFile(this.filePath, "utf8");
      const entries = fileContents
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as PersistedAuditEntry];
          } catch {
            return [];
          }
        })
        .filter((entry) => entry.sellerNumericId === sellerNumericId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, limit);

      return entries.map((entry) => this.toPublicEntry(entry));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  private toPublicEntry(entry: PersistedAuditEntry): SellerActionAuditEntry {
    return {
      id: entry.id,
      action: entry.action,
      actorRole: entry.actorRole,
      actorName: entry.actorName,
      summary: entry.summary,
      metadata: entry.metadata,
      createdAt: entry.createdAt
    };
  }
}
