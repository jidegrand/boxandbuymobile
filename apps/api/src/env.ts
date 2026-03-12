const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 4000),
  authProvider: process.env.AUTH_PROVIDER ?? "prestashop",
  jwtSecret: process.env.JWT_SECRET ?? "replace-me-with-a-long-random-secret",
  jwtIssuer: process.env.JWT_ISSUER ?? "boxandbuy-mobile-api",
  jwtAudience: process.env.JWT_AUDIENCE ?? "boxandbuy-mobile",
  accessTokenTtlSeconds: toNumber(process.env.ACCESS_TOKEN_TTL_SECONDS, 900),
  refreshTokenTtlSeconds: toNumber(process.env.REFRESH_TOKEN_TTL_SECONDS, 2_592_000),
  prestashopParametersPath:
    process.env.PRESTASHOP_PARAMETERS_PATH ?? "/var/www/boxandbuy.com/public_html/app/config/parameters.php",
  prestashopBaseUrl: (process.env.PRESTASHOP_BASE_URL ?? "https://www.boxandbuy.com").replace(/\/+$/, ""),
  growthEnvPath: process.env.GROWTH_ENV_PATH ?? "/opt/boxandbuy-growth/.env",
  growthWebBaseUrl: (process.env.GROWTH_WEB_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/+$/, ""),
  demoUserEmail: process.env.DEMO_USER_EMAIL ?? "buyer@boxandbuy.local",
  demoUserPassword: process.env.DEMO_USER_PASSWORD ?? "Password123!",
  demoUserName: process.env.DEMO_USER_NAME ?? "Demo Buyer"
} as const;
