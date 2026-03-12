import express from "express";

import { env } from "./env";
import { createMobileAuthRouter } from "./routes/mobile-auth";
import { createMobileBusinessRouter } from "./routes/mobile-business";
import { createMobileCatalogRouter } from "./routes/mobile-catalog";
import { createMobileCartRouter } from "./routes/mobile-cart";
import { createMobileCheckoutRouter } from "./routes/mobile-checkout";
import { createMobileLocationsRouter } from "./routes/mobile-locations";
import { createMobileOrdersRouter } from "./routes/mobile-orders";
import { createMobileRfqsRouter } from "./routes/mobile-rfqs";
import { createMobileSellerActionsRouter } from "./routes/mobile-seller-actions";
import { createMobileSellerRouter } from "./routes/mobile-seller";
import { createMobileTelemetryRouter } from "./routes/mobile-telemetry";
import type { AuthProvider } from "./services/auth-provider";
import { GrowthAnalyticsService } from "./services/growth-analytics-service";
import { PrestashopBusinessService } from "./services/prestashop-business-service";
import { PrestashopCartService } from "./services/prestashop-cart-service";
import { PrestashopCatalogService } from "./services/prestashop-catalog-service";
import { PrestashopOrderService } from "./services/prestashop-order-service";
import { PrestashopRfqService } from "./services/prestashop-rfq-service";
import { PrestashopSellerActionsService } from "./services/prestashop-seller-actions-service";
import { TelemetryLogService } from "./services/telemetry-log-service";
import { DemoAuthProvider } from "./services/demo-auth-provider";
import { PrestashopAuthProvider } from "./services/prestashop-auth-provider";

function createAuthProvider(): AuthProvider {
  if (env.authProvider === "prestashop") {
    return new PrestashopAuthProvider();
  }

  return new DemoAuthProvider();
}

export function createApp() {
  const app = express();
  const authProvider = createAuthProvider();
  const businessService = new PrestashopBusinessService();
  const catalogService = new PrestashopCatalogService();
  const cartService = new PrestashopCartService();
  const orderService = new PrestashopOrderService(cartService);
  const rfqService = new PrestashopRfqService(businessService);
  const growthAnalyticsService = new GrowthAnalyticsService();
  const sellerActionsService = new PrestashopSellerActionsService();
  const telemetryLogService = new TelemetryLogService();

  app.disable("x-powered-by");
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "mobile-api",
      authProvider: env.authProvider
    });
  });

  app.use("/api/mobile/auth", createMobileAuthRouter(authProvider));
  app.use("/api/mobile/business", createMobileBusinessRouter(authProvider, businessService));
  app.use("/api/mobile/catalog", createMobileCatalogRouter(catalogService));
  app.use("/api/mobile/cart", createMobileCartRouter(authProvider, cartService));
  app.use("/api/mobile/checkout", createMobileCheckoutRouter(authProvider, orderService));
  app.use("/api/mobile/locations", createMobileLocationsRouter(cartService));
  app.use("/api/mobile/orders", createMobileOrdersRouter(authProvider, orderService));
  app.use("/api/mobile/rfqs", createMobileRfqsRouter(authProvider, rfqService));
  app.use("/api/mobile/seller", createMobileSellerRouter(authProvider, growthAnalyticsService));
  app.use("/api/mobile/seller", createMobileSellerActionsRouter(authProvider, sellerActionsService));
  app.use("/api/mobile/telemetry", createMobileTelemetryRouter(authProvider, telemetryLogService));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(500).json({ error: message });
  });

  return app;
}
