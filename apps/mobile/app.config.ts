import type { ConfigContext, ExpoConfig } from "expo/config";

const defaultEasProjectId = "9301296b-5907-40c3-a904-248e83b0f633";

export default function appConfig(_context: ConfigContext): ExpoConfig {
  const deepLinkDomain = process.env.EXPO_PUBLIC_DEEP_LINK_DOMAIN ?? "";
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? defaultEasProjectId;
  const updatesUrl = process.env.EXPO_PUBLIC_UPDATES_URL ?? "";

  return {
    name: "BoxAndBuy Mobile",
    slug: "boxandbuy-mobile",
    scheme: "boxandbuymobile",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-notifications",
      "expo-updates"
    ],
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      ...(updatesUrl ? { url: updatesUrl } : {})
    },
    ios: {
      bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? "com.boxandbuy.mobile",
      associatedDomains: deepLinkDomain ? [`applinks:${deepLinkDomain}`] : []
    },
    android: {
      package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? "com.boxandbuy.mobile",
      intentFilters: deepLinkDomain
        ? [
            {
              action: "VIEW",
              autoVerify: true,
              data: [
                {
                  scheme: "https",
                  host: deepLinkDomain
                }
              ],
              category: ["BROWSABLE", "DEFAULT"]
            }
          ]
        : []
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.boxandbuy.local",
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
      eas: {
        projectId: easProjectId
      },
      deepLinkDomain,
      updatesUrl
    }
  };
}
