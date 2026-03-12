import { sellerFilterQuerySchema } from "@boxandbuy/contracts";
import express from "express";
import { ZodError } from "zod";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import {
  GrowthAnalyticsService,
  GrowthSellerServiceError
} from "../services/growth-analytics-service";

export function createMobileSellerRouter(
  authProvider: AuthProvider,
  growthAnalyticsService: GrowthAnalyticsService
) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.use(authMiddleware);

  router.get("/context", async (req: AuthedRequest, res) => {
    try {
      return res.json(await growthAnalyticsService.getContext(req.authUser!));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller context")
      });
    }
  });

  router.get("/dashboard", async (req: AuthedRequest, res) => {
    try {
      const filters = sellerFilterQuerySchema.parse({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        storeId: typeof req.query.storeId === "string" ? req.query.storeId : undefined
      });

      return res.json(await growthAnalyticsService.getDashboard(req.authUser!, filters));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller dashboard")
      });
    }
  });

  router.get("/products", async (req: AuthedRequest, res) => {
    try {
      const filters = sellerFilterQuerySchema.parse({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        storeId: typeof req.query.storeId === "string" ? req.query.storeId : undefined
      });

      return res.json(await growthAnalyticsService.listProducts(req.authUser!, filters));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller products")
      });
    }
  });

  router.get("/campaigns", async (req: AuthedRequest, res) => {
    try {
      const filters = sellerFilterQuerySchema.parse({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        storeId: typeof req.query.storeId === "string" ? req.query.storeId : undefined
      });

      return res.json(await growthAnalyticsService.listCampaigns(req.authUser!, filters));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller campaigns")
      });
    }
  });

  router.get("/listings", async (req: AuthedRequest, res) => {
    try {
      const filters = sellerFilterQuerySchema.parse({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        storeId: typeof req.query.storeId === "string" ? req.query.storeId : undefined
      });

      return res.json(await growthAnalyticsService.listListings(req.authUser!, filters));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller listings")
      });
    }
  });

  router.get("/affiliates", async (req: AuthedRequest, res) => {
    try {
      const filters = sellerFilterQuerySchema.parse({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        storeId: typeof req.query.storeId === "string" ? req.query.storeId : undefined
      });

      return res.json(await growthAnalyticsService.listAffiliates(req.authUser!, filters));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller affiliates")
      });
    }
  });

  router.get("/trends", async (req: AuthedRequest, res) => {
    try {
      const filters = sellerFilterQuerySchema.parse({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        storeId: typeof req.query.storeId === "string" ? req.query.storeId : undefined
      });

      return res.json(await growthAnalyticsService.listTrends(req.authUser!, filters));
    } catch (error) {
      return res.status(getStatusCode(error)).json({
        error: getErrorMessage(error, "Unable to load seller trends")
      });
    }
  });

  return router;
}

function getStatusCode(error: unknown) {
  if (error instanceof GrowthSellerServiceError) {
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
