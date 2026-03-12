import {
  businessApplicationInputSchema,
  guestBusinessApplicationInputSchema,
  termsApplicationInputSchema
} from "@boxandbuy/contracts";
import express from "express";
import { ZodError } from "zod";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import {
  BusinessServiceError,
  type PrestashopBusinessService
} from "../services/prestashop-business-service";

export function createMobileBusinessRouter(authProvider: AuthProvider, businessService: PrestashopBusinessService) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.post("/guest-application", async (req, res) => {
    try {
      const payload = guestBusinessApplicationInputSchema.parse(req.body);
      return res.status(201).json(await businessService.submitGuestApplication(payload));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to submit guest business application");
      return res.status(isClientError(error) ? 400 : 500).json({ error: message });
    }
  });

  router.use(authMiddleware);

  router.get("/overview", async (req: AuthedRequest, res) => {
    try {
      return res.json(await businessService.getOverview(req.authUser!.id));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load business overview");
      return res.status(isClientError(error) ? 400 : 500).json({ error: message });
    }
  });

  router.post("/application", async (req: AuthedRequest, res) => {
    try {
      const payload = businessApplicationInputSchema.parse(req.body);
      return res.status(201).json(await businessService.submitApplication(req.authUser!.id, payload));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to submit business application");
      return res.status(isClientError(error) ? 400 : 500).json({ error: message });
    }
  });

  router.post("/terms", async (req: AuthedRequest, res) => {
    try {
      const payload = termsApplicationInputSchema.parse(req.body);
      return res.status(201).json(await businessService.submitTermsApplication(req.authUser!.id, payload));
    } catch (error) {
      const message = getErrorMessage(error, "Unable to submit terms application");
      return res.status(isClientError(error) ? 400 : 500).json({ error: message });
    }
  });

  return router;
}

function isClientError(error: unknown) {
  return error instanceof BusinessServiceError || error instanceof ZodError;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const messages = error.issues.map((issue) => issue.message).filter(Boolean);
    return messages.length ? messages.join(" ") : fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
