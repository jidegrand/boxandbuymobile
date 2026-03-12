import { idParamSchema } from "@boxandbuy/contracts";
import express from "express";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import type { PrestashopOrderService } from "../services/prestashop-order-service";

export function createMobileOrdersRouter(authProvider: AuthProvider, orderService: PrestashopOrderService) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.use(authMiddleware);

  router.get("/", async (req: AuthedRequest, res) => {
    try {
      return res.json(await orderService.listOrders(req.authUser!.id));
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to load orders"
      });
    }
  });

  router.get("/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const order = await orderService.getOrderById(req.authUser!.id, id);

      if (!order) {
        return res.status(404).json({
          error: "Order not found"
        });
      }

      return res.json(order);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid order request"
      });
    }
  });

  return router;
}
