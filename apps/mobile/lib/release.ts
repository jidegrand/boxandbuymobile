import { useMemo } from "react";

import * as Updates from "expo-updates";

import { getAppRuntimeInfo } from "./app-runtime";

export function useReleaseStatus() {
  return useMemo(() => {
    const runtime = getAppRuntimeInfo();

    return {
      ...runtime,
      isUpdateEnabled: Updates.isEnabled,
      channel: typeof Updates.channel === "string" ? Updates.channel : undefined
    };
  }, []);
}
