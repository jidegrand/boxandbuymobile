import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";

import { useNotificationsBootstrap } from "../lib/notifications";
import { useQueryLifecycleBridge, useNetworkTelemetry } from "../lib/network";
import { useReleaseStatus } from "../lib/release";
import { trackEvent } from "../lib/telemetry";

export function useReleaseHardening() {
  const pathname = usePathname();
  const release = useReleaseStatus();
  const hasTrackedUpdateStatus = useRef(false);

  useQueryLifecycleBridge();
  useNetworkTelemetry();
  useNotificationsBootstrap();

  useEffect(() => {
    if (pathname) {
      void trackEvent({
        name: "screen_view",
        level: "info",
        route: pathname,
        message: `Screen view: ${pathname}`
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (hasTrackedUpdateStatus.current) {
      return;
    }

    hasTrackedUpdateStatus.current = true;
    void trackEvent({
      name: "update_status",
      level: "info",
      message: `runtime=${release.runtimeVersion} embedded=${String(release.isEmbeddedLaunch)} updates=${String(release.isUpdateEnabled)}`,
      metadata: {
        runtimeVersion: release.runtimeVersion,
        isEmbeddedLaunch: String(release.isEmbeddedLaunch),
        isUpdateEnabled: String(release.isUpdateEnabled),
        ...(release.channel ? { channel: release.channel } : {}),
        ...(release.updateId ? { updateId: release.updateId } : {})
      }
    });
  }, [
    release.channel,
    release.isEmbeddedLaunch,
    release.isUpdateEnabled,
    release.runtimeVersion,
    release.updateId
  ]);

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      if (url) {
        void trackEvent({
          name: "deep_link_opened",
          level: "info",
          route: url,
          message: `Initial deep link opened: ${url}`
        });
      }
    });
  }, []);
}
