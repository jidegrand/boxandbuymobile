import { addressInputSchema, cartAddressSelectionSchema, cartItemInputSchema, cartItemUpdateSchema, idParamSchema } from "@boxandbuy/contracts";
import express from "express";

import { createAuthMiddleware, type AuthedRequest } from "./auth-middleware";
import type { AuthProvider } from "../services/auth-provider";
import type { PrestashopCartService } from "../services/prestashop-cart-service";

export function createMobileCartRouter(authProvider: AuthProvider, cartService: PrestashopCartService) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(authProvider);

  router.use(authMiddleware);

  router.get("/", async (req: AuthedRequest, res) => {
    try {
      return res.json(await cartService.getCart(req.authUser!.id));
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to load cart"
      });
    }
  });

  router.post("/items", async (req: AuthedRequest, res) => {
    try {
      const payload = cartItemInputSchema.parse(req.body);
      return res.status(201).json(await cartService.addItem(req.authUser!.id, payload));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid cart item request"
      });
    }
  });

  router.patch("/items/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const payload = cartItemUpdateSchema.parse(req.body);
      return res.json(await cartService.updateItemQuantity(req.authUser!.id, id, payload.quantity));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid cart update request"
      });
    }
  });

  router.delete("/items/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      return res.json(await cartService.removeItem(req.authUser!.id, id));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid cart delete request"
      });
    }
  });

  router.put("/addresses/selection", async (req: AuthedRequest, res) => {
    try {
      const payload = cartAddressSelectionSchema.parse(req.body);
      return res.json(await cartService.setAddressSelection(req.authUser!.id, payload));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid address selection request"
      });
    }
  });

  router.post("/addresses", async (req: AuthedRequest, res) => {
    try {
      const payload = addressInputSchema.parse(req.body);
      return res.status(201).json(await cartService.createAddress(req.authUser!.id, payload));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid address request"
      });
    }
  });

  router.patch("/addresses/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const payload = addressInputSchema.parse(req.body);
      return res.json(await cartService.updateAddress(req.authUser!.id, id, payload));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid address update request"
      });
    }
  });

  router.delete("/addresses/:id", async (req: AuthedRequest, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      return res.json(await cartService.deleteAddress(req.authUser!.id, id));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid address delete request"
      });
    }
  });

  return router;
}
