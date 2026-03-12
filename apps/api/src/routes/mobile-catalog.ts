import { idParamSchema, productListQuerySchema } from "@boxandbuy/contracts";
import express from "express";

import type { PrestashopCatalogService } from "../services/prestashop-catalog-service";

export function createMobileCatalogRouter(catalogService: PrestashopCatalogService) {
  const router = express.Router();

  router.get("/home", async (_req, res) => {
    try {
      return res.json(await catalogService.getHome());
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to load catalog home"
      });
    }
  });

  router.get("/products", async (req, res) => {
    try {
      const query = productListQuerySchema.parse({
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        categoryId: typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
        page: typeof req.query.page === "string" ? req.query.page : undefined,
        pageSize: typeof req.query.pageSize === "string" ? req.query.pageSize : undefined
      });

      return res.json(await catalogService.listProducts(query));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid catalog request"
      });
    }
  });

  router.get("/products/:id", async (req, res) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const product = await catalogService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          error: "Product not found"
        });
      }

      return res.json(product);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid product request"
      });
    }
  });

  return router;
}
