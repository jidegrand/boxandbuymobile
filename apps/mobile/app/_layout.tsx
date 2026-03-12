import "../global.css";

import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";

import { useSessionBootstrap } from "../hooks/use-session";
import { env } from "../lib/env";
import { queryClient } from "../lib/query-client";

function Providers({ children }: { children: ReactNode }) {
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

  return (
    <Providers>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShadowVisible: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
          <Stack.Screen name="cart/checkout" options={{ title: "Checkout" }} />
          <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
        </Stack>
      </QueryClientProvider>
    </Providers>
  );
}
