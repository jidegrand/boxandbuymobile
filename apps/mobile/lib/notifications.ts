import { useEffect } from "react";
import { Linking, Platform } from "react-native";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { env } from "./env";
import { registerPushToken, trackEvent } from "./telemetry";
import { mmkv } from "./storage";
import { useAuthStore } from "../store/auth.store";

const LAST_PUSH_TOKEN_KEY = "notifications.lastPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export function useNotificationsBootstrap() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!hydrated || !accessToken) {
      return;
    }

    let disposed = false;

    void registerDevicePushToken().then((pushToken) => {
      if (disposed || !pushToken) {
        return;
      }

      const previous = mmkv.getString(LAST_PUSH_TOKEN_KEY);
      if (previous === pushToken) {
        return;
      }

      mmkv.set(LAST_PUSH_TOKEN_KEY, pushToken);
      void registerPushToken({
        token: pushToken,
        platform: Platform.OS,
        deviceName: Device.modelName ?? Device.deviceName ?? "Unknown device"
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = getNotificationUrl(response.notification.request.content.data);
      void trackEvent({
        name: "notification_opened",
        level: "info",
        route: url ?? undefined,
        metadata: url ? { url } : undefined
      });

      if (url) {
        void trackEvent({
          name: "deep_link_opened",
          level: "info",
          route: url
        });

        void Linking.openURL(url).catch((error) => {
          void trackEvent({
            name: "app_error",
            level: "warning",
            message: error instanceof Error ? error.message : "Unable to open notification link",
            route: url
          });
        });
      }
    });

    return () => {
      disposed = true;
      responseSubscription.remove();
    };
  }, [accessToken, hydrated]);
}

async function registerDevicePushToken() {
  if (!Device.isDevice) {
    await trackEvent({
      name: "notification_permission",
      level: "warning",
      message: "Push notifications require a physical device."
    });
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  await trackEvent({
    name: "notification_permission",
    level: finalStatus === "granted" ? "info" : "warning",
    message: `Notification permission is ${finalStatus}.`
  });

  if (finalStatus !== "granted" || !env.easProjectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: env.easProjectId
  });

  await trackEvent({
    name: "push_token_registered",
    level: "info",
    message: "Expo push token registered."
  });

  return token.data;
}

function getNotificationUrl(data: Record<string, unknown> | undefined) {
  const url = typeof data?.url === "string" ? data.url : undefined;
  return url?.trim() ? url : null;
}
