import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";

import { trackEvent } from "./telemetry";

export function useQueryLifecycleBridge() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      focusManager.setFocused(state === "active");
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
      onlineManager.setOnline(isOnline);
    });

    return unsubscribe;
  }, []);
}

export function useNetworkTelemetry() {
  const netInfo = useNetInfo();

  useEffect(() => {
    void trackEvent({
      name: "network_status",
      level: netInfo.isConnected === false || netInfo.isInternetReachable === false ? "warning" : "info",
      message: `Network connected=${String(netInfo.isConnected)} reachable=${String(netInfo.isInternetReachable)}`
    });
  }, [netInfo.isConnected, netInfo.isInternetReachable]);
}
