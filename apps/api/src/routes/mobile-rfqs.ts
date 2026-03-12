import { idParamSchema, submitRfqInputSchema } from "@boxandbuy/contracts";
import express from "express";
import { ZodError } from "zod";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import type { PrestashopRfqService } from "../services/prestashop-rfq-service";
import { RfqServiceError } from "../services/prestashop-rfq-service";

export function createMobileRfqsRouter(authProvider: AuthProvider, rfqService: PrestashopRfqService) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.use(authMiddleware);

  router.get("/", async (req: AuthedRequest, res) => {
    try {
      return res.json(await rfqService.listRfqs(req.authUser!.id));
    } catch (error) {
      return res.status(isClientError(error) ? 400 : 500).json({
        error: getErrorMessage(error, "Unable to load RFQs")
      });
    }
  });

  router.get("/current-cart", async (req: AuthedRequest, res) => {
    try {
      return res.json(await rfqService.getCurrentCartRfq(req.authUser!.id));
    } catch (error) {
      return res.status(isClientError(error) ? 400 : 500).json({
        error: getErrorMessage(error, "Unable to load current cart RFQ")
      });
    }
  });

  router.post("/", async (req: AuthedRequest, res) => {
    try {
      const payload = submitRfqInputSchema.parse(req.body);
      const response = await rfqService.createFromCurrentCart(req.authUser!.id, payload);
      return res.status(response.created ? 201 : 200).json(response);
    } catch (error) {
      return res.status(isClientError(error) ? 400 : 500).json({
        error: getErrorMessage(error, "Unable to submit RFQ")
      });
    }
  });

  router.get("/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const rfq = await rfqService.getRfqById(req.authUser!.id, id);

      if (!rfq) {
        return res.status(404).json({ error: "RFQ not found" });
      }

      return res.json(rfq);
    } catch (error) {
      return res.status(isClientError(error) ? 400 : 500).json({
        error: getErrorMessage(error, "Unable to load RFQ")
      });
    }
  });

  return router;
}

function isClientError(error: unknown) {
  return error instanceof RfqServiceError || error instanceof ZodError;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const messages = error.issues.map((issue) => issue.message).filter(Boolean);
    return messages.length ? messages.join(" ") : fallback;
  }

  return error instanceof Error ? error.message : fallback;
}
