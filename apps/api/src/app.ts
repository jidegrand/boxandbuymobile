import express from "express";

import { env } from "./env";
import { createMobileAuthRouter } from "./routes/mobile-auth";
import type { AuthProvider } from "./services/auth-provider";
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

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(500).json({ error: message });
  });

  return app;
}

