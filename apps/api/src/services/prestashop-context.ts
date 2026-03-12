import { readFile } from "node:fs/promises";

import mysql from "mysql2/promise";

import { env } from "../env";

export type PrestashopConfig = {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  prefix: string;
  cookieKey: string;
  baseUrl: string;
};

export type PrestashopContextValues = {
  defaultShopId: number;
  defaultShopGroupId: number;
  defaultLanguageId: number;
  defaultCustomerGroupId: number;
  passwordCooldownMinutes: number;
  currencyCode: string;
  homeCategoryId: number;
  allowOutOfStockOrders: boolean;
};

type ConfigurationRow = {
  name: string;
  value: string | null;
};

let configPromise: Promise<PrestashopConfig> | undefined;
let poolPromise: Promise<mysql.Pool> | undefined;
let contextPromise: Promise<PrestashopContextValues> | undefined;

export async function getPrestashopPool() {
  if (!poolPromise) {
    poolPromise = getPrestashopConfig().then((config) =>
      mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        connectionLimit: 5
      })
    );
  }

  return poolPromise;
}

export async function getPrestashopContext() {
  if (!contextPromise) {
    contextPromise = (async () => {
      const pool = await getPrestashopPool();
      const config = await getPrestashopConfig();
      const [configurationRows] = await pool.execute<mysql.RowDataPacket[]>(
        `
          SELECT name, value
          FROM \`${config.prefix}configuration\`
          WHERE name IN (
            'PS_LANG_DEFAULT',
            'PS_CUSTOMER_GROUP',
            'PS_SHOP_DEFAULT',
            'PS_PASSWD_TIME_FRONT',
            'PS_CURRENCY_DEFAULT',
            'PS_HOME_CATEGORY',
            'PS_ORDER_OUT_OF_STOCK'
          )
        `
      );

      const configuration = new Map(
        (configurationRows as ConfigurationRow[]).map((row) => [row.name, row.value ?? ""])
      );

      const defaultShopId = Number.parseInt(configuration.get("PS_SHOP_DEFAULT") ?? "1", 10) || 1;
      const defaultLanguageId = Number.parseInt(configuration.get("PS_LANG_DEFAULT") ?? "1", 10) || 1;
      const defaultCustomerGroupId = Number.parseInt(configuration.get("PS_CUSTOMER_GROUP") ?? "3", 10) || 3;
      const passwordCooldownMinutes = Number.parseInt(configuration.get("PS_PASSWD_TIME_FRONT") ?? "0", 10) || 0;
      const defaultCurrencyId = Number.parseInt(configuration.get("PS_CURRENCY_DEFAULT") ?? "1", 10) || 1;
      const homeCategoryId = Number.parseInt(configuration.get("PS_HOME_CATEGORY") ?? "2", 10) || 2;
      const allowOutOfStockOrders = configuration.get("PS_ORDER_OUT_OF_STOCK") === "1";

      const [[shopRow], [currencyRow]] = await Promise.all([
        pool.execute<mysql.RowDataPacket[]>(
          `
            SELECT id_shop_group
            FROM \`${config.prefix}shop\`
            WHERE id_shop = ?
            LIMIT 1
          `,
          [defaultShopId]
        ),
        pool.execute<mysql.RowDataPacket[]>(
          `
            SELECT iso_code
            FROM \`${config.prefix}currency\`
            WHERE id_currency = ?
            LIMIT 1
          `,
          [defaultCurrencyId]
        )
      ]);

      const defaultShopGroupId = Number.parseInt(String(shopRow[0]?.id_shop_group ?? "1"), 10) || 1;
      const currencyCode = typeof currencyRow[0]?.iso_code === "string" ? currencyRow[0].iso_code : "USD";

      return {
        defaultShopId,
        defaultShopGroupId,
        defaultLanguageId,
        defaultCustomerGroupId,
        passwordCooldownMinutes,
        currencyCode,
        homeCategoryId,
        allowOutOfStockOrders
      };
    })();
  }

  return contextPromise;
}

export async function getPrestashopConfig(): Promise<PrestashopConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const overrides = {
        host: process.env.PRESTASHOP_DB_HOST,
        port: process.env.PRESTASHOP_DB_PORT,
        database: process.env.PRESTASHOP_DB_NAME,
        user: process.env.PRESTASHOP_DB_USER,
        password: process.env.PRESTASHOP_DB_PASSWORD,
        prefix: process.env.PRESTASHOP_DB_PREFIX,
        cookieKey: process.env.PRESTASHOP_COOKIE_KEY
      };

      if (
        overrides.host &&
        overrides.database &&
        overrides.user &&
        overrides.password &&
        overrides.prefix &&
        overrides.cookieKey
      ) {
        return {
          host: overrides.host,
          port: overrides.port ? Number.parseInt(overrides.port, 10) || undefined : undefined,
          database: overrides.database,
          user: overrides.user,
          password: overrides.password,
          prefix: overrides.prefix,
          cookieKey: overrides.cookieKey,
          baseUrl: env.prestashopBaseUrl
        };
      }

      const fileContents = await readFile(env.prestashopParametersPath, "utf8");
      const parameters = extractPhpParameters(fileContents);

      return {
        host: parameters.database_host,
        port: parameters.database_port ? Number.parseInt(parameters.database_port, 10) || undefined : undefined,
        database: parameters.database_name,
        user: parameters.database_user,
        password: parameters.database_password,
        prefix: parameters.database_prefix,
        cookieKey: parameters.cookie_key,
        baseUrl: env.prestashopBaseUrl
      };
    })();
  }

  return configPromise;
}

export async function buildPrestashopImageUrl(idImage: number, type: string) {
  const config = await getPrestashopConfig();
  const nestedPath = String(idImage).split("").join("/");

  return `${config.baseUrl}/img/p/${nestedPath}/${idImage}-${type}.jpg`;
}

function extractPhpParameters(fileContents: string) {
  const keys = [
    "database_host",
    "database_port",
    "database_name",
    "database_user",
    "database_password",
    "database_prefix",
    "cookie_key"
  ] as const;

  const values = Object.create(null) as Record<(typeof keys)[number], string>;

  for (const key of keys) {
    const match = fileContents.match(new RegExp(`'${key}'\\s*=>\\s*(NULL|'([^']*)')`, "i"));

    if (!match) {
      throw new Error(`Missing ${key} in PrestaShop parameters file.`);
    }

    values[key] = match[1] === "NULL" ? "" : match[2] ?? "";
  }

  return values;
}
