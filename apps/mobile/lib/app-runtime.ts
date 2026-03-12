import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

import { env } from "./env";

export function getAppRuntimeInfo() {
  return {
    appVersion: Application.nativeApplicationVersion ?? "0.0.0",
    buildVersion: Application.nativeBuildVersion ?? "dev",
    appEnv: env.appEnv,
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    deviceName: Device.modelName ?? Device.deviceName ?? "Unknown device",
    runtimeVersion:
      typeof Updates.runtimeVersion === "string" && Updates.runtimeVersion
        ? Updates.runtimeVersion
        : "unknown",
    updateId:
      typeof Updates.updateId === "string" && Updates.updateId
        ? Updates.updateId
        : undefined,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch
  };
}
