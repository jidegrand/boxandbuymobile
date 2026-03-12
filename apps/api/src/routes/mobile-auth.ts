import type { AuthSession } from "@boxandbuy/contracts";
import type { Request, Response, NextFunction } from "express";

import {
  loginPayloadSchema,
  logoutPayloadSchema,
  refreshPayloadSchema,
  registerPayloadSchema,
  type SessionUser
} from "@boxandbuy/contracts";
import express from "express";

import { issueAccessToken, verifyAccessToken } from "../auth/access-token";
import { RefreshStore } from "../auth/refresh-store";
import { env } from "../env";
import type { AuthProvider } from "../services/auth-provider";

type AuthedRequest = Request & {
  authUser?: SessionUser;
};

function unauthorized(res: Response) {
  return res.status(401).json({ error: "Unauthenticated" });
}

async function createSession(user: SessionUser, refreshStore: RefreshStore): Promise<AuthSession> {
  const accessToken = await issueAccessToken(user);
  const refreshToken = refreshStore.issue(user.id);

  return {
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: env.accessTokenTtlSeconds
    },
    user
  };
}

function authMiddleware(authProvider: AuthProvider) {
  return async function authHandler(req: AuthedRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

    if (!token) {
      return unauthorized(res);
    }

    try {
      const claims = await verifyAccessToken(token);
      const user = await authProvider.getUserById(claims.userId);

      if (!user) {
        return unauthorized(res);
      }

      req.authUser = user;
      return next();
    } catch {
      return unauthorized(res);
    }
  };
}

export function createMobileAuthRouter(authProvider: AuthProvider) {
  const router = express.Router();
  const refreshStore = new RefreshStore(env.refreshTokenTtlSeconds);

  router.post("/login", async (req, res) => {
    try {
      const payload = loginPayloadSchema.parse(req.body);
      const user = await authProvider.login(payload);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      return res.json(await createSession(user, refreshStore));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid login request" });
    }
  });

  router.post("/register", async (req, res) => {
    try {
      const payload = registerPayloadSchema.parse(req.body);
      const user = await authProvider.register(payload);
      return res.status(201).json(await createSession(user, refreshStore));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid register request" });
    }
  });

  router.post("/refresh", async (req, res) => {
    try {
      const payload = refreshPayloadSchema.parse(req.body);
      const rotation = refreshStore.rotate(payload.refreshToken);

      if (!rotation) {
        return unauthorized(res);
      }

      const user = await authProvider.getUserById(rotation.userId);

      if (!user) {
        return unauthorized(res);
      }

      const accessToken = await issueAccessToken(user);

      return res.json({
        tokens: {
          accessToken,
          refreshToken: rotation.refreshToken,
          expiresIn: env.accessTokenTtlSeconds
        },
        user
      } satisfies AuthSession);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid refresh request" });
    }
  });

  router.post("/logout", async (req, res) => {
    try {
      const payload = logoutPayloadSchema.parse(req.body ?? {});
      refreshStore.revoke(payload.refreshToken);
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid logout request" });
    }
  });

  router.get("/me", authMiddleware(authProvider), async (req: AuthedRequest, res) => {
    return res.json({
      user: req.authUser
    });
  });

  return router;
}

