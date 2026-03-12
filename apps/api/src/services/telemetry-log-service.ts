import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  PushTokenRegistrationInput,
  SessionUser,
  TelemetryEventInput
} from "@boxandbuy/contracts";

import { env } from "../env";

type TelemetryRecord = TelemetryEventInput & {
  recordedAt: string;
  userId?: string;
  userEmail?: string;
};

type PushTokenRecord = PushTokenRegistrationInput & {
  recordedAt: string;
  userId: string;
  userEmail: string;
};

export class TelemetryLogService {
  constructor(
    private readonly telemetryPath = env.telemetryLogPath,
    private readonly pushTokenPath = env.pushTokenLogPath
  ) {}

  async recordEvent(event: TelemetryEventInput, user?: SessionUser | null) {
    const record: TelemetryRecord = {
      ...event,
      recordedAt: new Date().toISOString(),
      userId: user?.id,
      userEmail: user?.email
    };

    await this.appendLine(this.telemetryPath, record);
  }

  async recordPushToken(payload: PushTokenRegistrationInput, user: SessionUser) {
    const record: PushTokenRecord = {
      ...payload,
      recordedAt: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email
    };

    await this.appendLine(this.pushTokenPath, record);
  }

  private async appendLine(path: string, payload: object) {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(payload)}\n`, "utf8");
  }
}
