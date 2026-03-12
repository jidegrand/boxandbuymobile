import {
  pushTokenRegistrationInputSchema,
  telemetryEventInputSchema
} from "@boxandbuy/contracts";
import express from "express";
import { ZodError } from "zod";

import {
  createAuthMiddleware,
  type AuthedRequest,
  unauthorized
} from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import { TelemetryLogService } from "../services/telemetry-log-service";

export function createMobileTelemetryRouter(
  authProvider: AuthProvider,
  telemetryLogService: TelemetryLogService
) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.post("/events", async (req, res) => {
    try {
      const payload = telemetryEventInputSchema.parse(req.body);
      const user = await resolveOptionalUser(authProvider, req.headers.authorization);
      await telemetryLogService.recordEvent(payload, user);
      return res.status(202).json({ accepted: true });
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to record telemetry event")
      });
    }
  });

  router.post("/push-token", authMiddleware, async (req: AuthedRequest, res) => {
    try {
      if (!req.authUser) {
        return unauthorized(res);
      }

      const payload = pushTokenRegistrationInputSchema.parse(req.body);
      await telemetryLogService.recordPushToken(payload, req.authUser);
      return res.status(202).json({ accepted: true });
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to register push token")
      });
    }
  });

  return router;
}

async function resolveOptionalUser(authProvider: AuthProvider, authorizationHeader: string | undefined) {
  const header = authorizationHeader ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token) {
    return null;
  }

  try {
    const { verifyAccessToken } = await import("../auth/access-token");
    const claims = await verifyAccessToken(token);
    return authProvider.getUserById(claims.userId);
  } catch {
    return null;
  }
}

function getStatusCode(error: unknown) {
  if (error instanceof ZodError) {
    return 400;
  }

  return 500;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const messages = error.issues.map((issue) => issue.message).filter(Boolean);
    return messages.length ? messages.join(" ") : fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
