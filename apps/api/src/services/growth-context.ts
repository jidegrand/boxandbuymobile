import { readFile } from "node:fs/promises";

import { env } from "../env";

export type GrowthRuntimeConfig = {
  appOrigin: string;
  mainDashboardOrigin: string;
  jwtSharedSecret: string;
  cookieName: string;
  webBaseUrl: string;
};

let growthConfigPromise: Promise<GrowthRuntimeConfig> | undefined;

export async function getGrowthRuntimeConfig() {
  if (!growthConfigPromise) {
    growthConfigPromise = (async () => {
      let variables: Record<string, string> = {};

      try {
        const fileContents = await readFile(env.growthEnvPath, "utf8");
        variables = parseDotEnv(fileContents);
      } catch {
        variables = {};
      }

      return {
        appOrigin: variables.APP_ORIGIN?.trim() || "https://marketplace.boxandbuy.com",
        mainDashboardOrigin: variables.MAIN_DASHBOARD_ORIGIN?.trim() || "https://seller.boxandbuy.com",
        jwtSharedSecret:
          variables.JWT_SHARED_SECRET?.trim() || "strong_shared_secret_between_main_dashboard_and_growth_center",
        cookieName: variables.SESSION_COOKIE_NAME?.trim() || "bbgc_session",
        webBaseUrl: env.growthWebBaseUrl
      };
    })();
  }

  return growthConfigPromise;
}

function parseDotEnv(fileContents: string) {
  const values: Record<string, string> = {};

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      values[key] = rawValue.slice(1, -1);
      continue;
    }

    values[key] = rawValue;
  }

  return values;
}
