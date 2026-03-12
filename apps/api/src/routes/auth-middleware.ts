import type { SessionUser } from "@boxandbuy/contracts";
import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../auth/access-token";
import type { AuthProvider } from "../services/auth-provider";

export type AuthedRequest = Request & {
  authUser?: SessionUser;
};

export function unauthorized(res: Response) {
  return res.status(401).json({ error: "Unauthenticated" });
}

export function createAuthMiddleware(authProvider: AuthProvider) {
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
