import type { ConfigContext, ExpoConfig } from "expo/config";

export default function appConfig(_context: ConfigContext): ExpoConfig {
  return {
    name: "BoxAndBuy Mobile",
    slug: "boxandbuy-mobile",
    scheme: "boxandbuymobile",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    plugins: [
      "expo-router",
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.boxandbuy.local",
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development"
    }
  };
}

