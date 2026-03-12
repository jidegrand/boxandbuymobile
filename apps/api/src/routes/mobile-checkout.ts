import express from "express";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import type { PrestashopOrderService } from "../services/prestashop-order-service";

export function createMobileCheckoutRouter(authProvider: AuthProvider, orderService: PrestashopOrderService) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.use(authMiddleware);

  router.get("/session", async (req: AuthedRequest, res) => {
    try {
      return res.json(await orderService.getCheckoutSession(req.authUser!.id));
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to create checkout session"
      });
    }
  });

  return router;
}
