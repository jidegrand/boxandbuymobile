import "../global.css";

import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactElement } from "react";

import { AppErrorBoundary } from "../components/ui/app-error-boundary";
import { OfflineBanner } from "../components/ui/offline-banner";
import { useReleaseHardening } from "../hooks/use-release-hardening";
import { useSessionBootstrap } from "../hooks/use-session";
import { env } from "../lib/env";
import { queryClient } from "../lib/query-client";

function Providers({ children }: { children: ReactElement }) {
  const publishableKey = env.stripePublishableKey;

  if (!publishableKey) {
    return <>{children}</>;
  }

  return (
    <StripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.boxandbuy.mobile">
      {children}
    </StripeProvider>
  );
}

export default function RootLayout() {
  useSessionBootstrap();
  useReleaseHardening();

  return (
    <AppErrorBoundary>
      <Providers>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <OfflineBanner />
          <Stack screenOptions={{ headerShadowVisible: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
            <Stack.Screen name="cart/checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
            <Stack.Screen name="rfqs/[id]" options={{ title: "RFQ" }} />
            <Stack.Screen name="seller/products" options={{ title: "Seller Products" }} />
            <Stack.Screen name="seller/campaigns" options={{ title: "Seller Campaigns" }} />
            <Stack.Screen name="seller/listings" options={{ title: "Listing Health" }} />
            <Stack.Screen name="seller/affiliates" options={{ title: "Affiliates" }} />
            <Stack.Screen name="seller/profile" options={{ title: "Seller Profile" }} />
            <Stack.Screen name="seller/messages/index" options={{ title: "Seller Messages" }} />
            <Stack.Screen name="seller/messages/[id]" options={{ title: "Seller Thread" }} />
            <Stack.Screen name="seller/payouts" options={{ title: "Seller Payouts" }} />
            <Stack.Screen name="seller/activity" options={{ title: "Seller Activity" }} />
          </Stack>
        </QueryClientProvider>
      </Providers>
    </AppErrorBoundary>
  );
}
