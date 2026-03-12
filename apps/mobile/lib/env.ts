const defaultEasProjectId = "9301296b-5907-40c3-a904-248e83b0f633";

export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.boxandbuy.local",
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? defaultEasProjectId,
  updatesUrl: process.env.EXPO_PUBLIC_UPDATES_URL ?? "",
  deepLinkDomain: process.env.EXPO_PUBLIC_DEEP_LINK_DOMAIN ?? ""
} as const;
