export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.boxandbuy.local",
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development"
} as const;

