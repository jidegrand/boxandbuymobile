import {
  sellerMessageReplyInputSchema,
  sellerPayoutRequestInputSchema,
  sellerProfileUpdateInputSchema,
  sellerThreadIdParamSchema
} from "@boxandbuy/contracts";
import express from "express";
import { ZodError } from "zod";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import {
  PrestashopSellerActionsService,
  SellerActionServiceError
} from "../services/prestashop-seller-actions-service";

export function createMobileSellerActionsRouter(
  authProvider: AuthProvider,
  sellerActionsService: PrestashopSellerActionsService
) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.use(authMiddleware);

  router.get("/profile", async (req: AuthedRequest, res) => {
    try {
      return res.json(await sellerActionsService.getProfile(req.authUser!));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller profile")
      });
    }
  });

  router.put("/profile", async (req: AuthedRequest, res) => {
    try {
      const payload = sellerProfileUpdateInputSchema.parse(req.body);
      return res.json(await sellerActionsService.updateProfile(req.authUser!, payload));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to update seller profile")
      });
    }
  });

  router.get("/messages", async (req: AuthedRequest, res) => {
    try {
      return res.json(await sellerActionsService.listMessageThreads(req.authUser!));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller messages")
      });
    }
  });

  router.get("/messages/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = sellerThreadIdParamSchema.parse(req.params);
      return res.json(await sellerActionsService.getMessageThread(req.authUser!, id));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller message thread")
      });
    }
  });

  router.post("/messages/:id/replies", async (req: AuthedRequest, res) => {
    try {
      const { id } = sellerThreadIdParamSchema.parse(req.params);
      const payload = sellerMessageReplyInputSchema.parse(req.body);
      return res.status(201).json(await sellerActionsService.replyToMessageThread(req.authUser!, id, payload));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to send seller reply")
      });
    }
  });

  router.get("/payouts", async (req: AuthedRequest, res) => {
    try {
      return res.json(await sellerActionsService.getPayoutOverview(req.authUser!));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller payouts")
      });
    }
  });

  router.post("/payouts", async (req: AuthedRequest, res) => {
    try {
      const payload = sellerPayoutRequestInputSchema.parse(req.body);
      return res.status(201).json(await sellerActionsService.requestPayout(req.authUser!, payload));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to create seller payout request")
      });
    }
  });

  router.get("/audit", async (req: AuthedRequest, res) => {
    try {
      return res.json(await sellerActionsService.getAuditLog(req.authUser!));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller action log")
      });
    }
  });

  return router;
}

function getStatusCode(error: unknown) {
  if (error instanceof SellerActionServiceError) {
    return error.statusCode;
  }

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
