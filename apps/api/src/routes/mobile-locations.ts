import { idParamSchema } from "@boxandbuy/contracts";
import express from "express";

import type { PrestashopCartService } from "../services/prestashop-cart-service";

export function createMobileLocationsRouter(cartService: PrestashopCartService) {
  const router = express.Router();

  router.get("/countries", async (_req, res) => {
    try {
      return res.json({
        countries: await cartService.listCountries()
      });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to load countries"
      });
    }
  });

  router.get("/countries/:id/states", async (req, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      return res.json({
        states: await cartService.listStates(id)
      });
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Unable to load states"
      });
    }
  });

  return router;
}
