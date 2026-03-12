import type { SessionUser } from "@boxandbuy/contracts";

import { jwtVerify, SignJWT } from "jose";

import { env } from "../env";

const encoder = new TextEncoder();

type AccessTokenClaims = {
  sub: string;
  email: string;
  name?: string;
  role?: string;
};

export async function issueAccessToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role
  } satisfies Omit<AccessTokenClaims, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(env.jwtIssuer)
    .setAudience(env.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(`${env.accessTokenTtlSeconds}s`)
    .sign(encoder.encode(env.jwtSecret));
}

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(token, encoder.encode(env.jwtSecret), {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience
  });

  return {
    userId: result.payload.sub ?? "",
    email: typeof result.payload.email === "string" ? result.payload.email : "",
    name: typeof result.payload.name === "string" ? result.payload.name : undefined,
    role: typeof result.payload.role === "string" ? result.payload.role : undefined
  };
}

