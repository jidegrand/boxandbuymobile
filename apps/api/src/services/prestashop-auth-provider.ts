import type { LoginPayload, RegisterPayload, SessionUser } from "@boxandbuy/contracts";

import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import { compare, hash } from "bcryptjs";
import mysql from "mysql2/promise";

import { env } from "../env";
import { AuthProviderError, type AuthProvider } from "./auth-provider";

type PrestashopConfig = {
  host: string;
  port?: number;
  database: string;
  user: string;
  password: string;
  prefix: string;
  cookieKey: string;
};

type CustomerRow = {
  id_customer: number;
  email: string;
  firstname: string;
  lastname: string;
  active: number;
  passwd: string;
};

type ConfigurationRow = {
  name: string;
  value: string | null;
};

export class PrestashopAuthProvider implements AuthProvider {
  private configPromise?: Promise<PrestashopConfig>;
  private poolPromise?: Promise<mysql.Pool>;
  private contextPromise?: Promise<{
    defaultShopId: number;
    defaultShopGroupId: number;
    defaultLanguageId: number;
    defaultCustomerGroupId: number;
    passwordCooldownMinutes: number;
  }>;

  async login(payload: LoginPayload): Promise<SessionUser | null> {
    const customer = await this.findCustomerByEmail(payload.email);

    if (!customer) {
      return null;
    }

    const config = await this.getConfig();
    const passwordMatches = await this.checkPassword(payload.password, customer.passwd, config.cookieKey);

    if (!passwordMatches) {
      return null;
    }

    if (!customer.active) {
      throw new AuthProviderError(
        "Your account isn't available at this time, please contact support.",
        "inactive_account"
      );
    }

    if (!customer.passwd.startsWith("$2")) {
      await this.upgradePasswordHash(customer.id_customer, payload.password);
    }

    return this.mapCustomer(customer);
  }

  async register(payload: RegisterPayload): Promise<SessionUser> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = await this.findCustomerByEmail(normalizedEmail);

    if (existing) {
      throw new AuthProviderError("A customer account already exists for this email.", "email_exists");
    }

    const pool = await this.getPool();
    const config = await this.getConfig();
    const context = await this.getContextValues();
    const now = new Date();
    const lastPasswordGeneratedAt = new Date(now.getTime() - context.passwordCooldownMinutes * 60_000);
    const secureKey = createHash("md5").update(randomBytes(32)).digest("hex");
    const hashedPassword = await this.hashPassword(payload.password);
    const fullName = `${payload.firstName} ${payload.lastName}`.trim();

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
        `
          INSERT INTO \`${config.prefix}customer\` (
            id_shop_group,
            id_shop,
            id_gender,
            id_default_group,
            id_lang,
            lastname,
            firstname,
            email,
            passwd,
            last_passwd_gen,
            secure_key,
            active,
            is_guest,
            deleted,
            newsletter,
            optin,
            date_add,
            date_upd
          ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, ?, ?)
        `,
        [
          context.defaultShopGroupId,
          context.defaultShopId,
          context.defaultCustomerGroupId,
          context.defaultLanguageId,
          payload.lastName.trim(),
          payload.firstName.trim(),
          normalizedEmail,
          hashedPassword,
          this.formatDate(lastPasswordGeneratedAt),
          secureKey,
          this.formatDate(now),
          this.formatDate(now)
        ]
      );

      const customerId = insertResult.insertId;

      await connection.execute(
        `
          INSERT INTO \`${config.prefix}customer_group\` (
            id_customer,
            id_group
          ) VALUES (?, ?)
        `,
        [customerId, context.defaultCustomerGroupId]
      );

      await connection.commit();

      return {
        id: String(customerId),
        email: normalizedEmail,
        name: fullName,
        role: "buyer"
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getUserById(userId: string): Promise<SessionUser | null> {
    const pool = await this.getPool();
    const config = await this.getConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_customer, email, firstname, lastname, active, passwd
        FROM \`${config.prefix}customer\`
        WHERE id_customer = ?
          AND deleted = 0
          AND is_guest = 0
        LIMIT 1
      `,
      [userId]
    );

    const customer = rows[0] as CustomerRow | undefined;

    if (!customer || !customer.active) {
      return null;
    }

    return this.mapCustomer(customer);
  }

  private async findCustomerByEmail(email: string) {
    const pool = await this.getPool();
    const config = await this.getConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_customer, email, firstname, lastname, active, passwd
        FROM \`${config.prefix}customer\`
        WHERE email = ?
          AND deleted = 0
          AND is_guest = 0
        ORDER BY id_customer DESC
        LIMIT 1
      `,
      [email.trim().toLowerCase()]
    );

    return (rows[0] as CustomerRow | undefined) ?? null;
  }

  private async getPool() {
    if (!this.poolPromise) {
      this.poolPromise = this.getConfig().then((config) =>
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

    return this.poolPromise;
  }

  private async getContextValues() {
    if (!this.contextPromise) {
      this.contextPromise = (async () => {
        const pool = await this.getPool();
        const config = await this.getConfig();
        const [configurationRows] = await pool.execute<mysql.RowDataPacket[]>(
          `
            SELECT name, value
            FROM \`${config.prefix}configuration\`
            WHERE name IN ('PS_LANG_DEFAULT', 'PS_CUSTOMER_GROUP', 'PS_SHOP_DEFAULT', 'PS_PASSWD_TIME_FRONT')
          `
        );

        const configuration = new Map(
          (configurationRows as ConfigurationRow[]).map((row) => [row.name, row.value ?? ""])
        );

        const defaultShopId = Number.parseInt(configuration.get("PS_SHOP_DEFAULT") ?? "1", 10) || 1;
        const defaultLanguageId = Number.parseInt(configuration.get("PS_LANG_DEFAULT") ?? "1", 10) || 1;
        const defaultCustomerGroupId = Number.parseInt(configuration.get("PS_CUSTOMER_GROUP") ?? "3", 10) || 3;
        const passwordCooldownMinutes = Number.parseInt(configuration.get("PS_PASSWD_TIME_FRONT") ?? "0", 10) || 0;

        const [shopRows] = await pool.execute<mysql.RowDataPacket[]>(
          `
            SELECT id_shop_group
            FROM \`${config.prefix}shop\`
            WHERE id_shop = ?
            LIMIT 1
          `,
          [defaultShopId]
        );

        const defaultShopGroupId =
          Number.parseInt(String(shopRows[0]?.id_shop_group ?? "1"), 10) || 1;

        return {
          defaultShopId,
          defaultShopGroupId,
          defaultLanguageId,
          defaultCustomerGroupId,
          passwordCooldownMinutes
        };
      })();
    }

    return this.contextPromise;
  }

  private async getConfig(): Promise<PrestashopConfig> {
    if (!this.configPromise) {
      this.configPromise = (async () => {
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
            cookieKey: overrides.cookieKey
          };
        }

        const fileContents = await readFile(env.prestashopParametersPath, "utf8");
        const parameters = this.extractPhpParameters(fileContents);

        return {
          host: parameters.database_host,
          port: parameters.database_port ? Number.parseInt(parameters.database_port, 10) || undefined : undefined,
          database: parameters.database_name,
          user: parameters.database_user,
          password: parameters.database_password,
          prefix: parameters.database_prefix,
          cookieKey: parameters.cookie_key
        };
      })();
    }

    return this.configPromise;
  }

  private extractPhpParameters(fileContents: string) {
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

  private async checkPassword(plainTextPassword: string, storedHash: string, cookieKey: string) {
    if (!storedHash) {
      return false;
    }

    if (storedHash.startsWith("$2")) {
      return compare(plainTextPassword, storedHash);
    }

    return createHash("md5").update(cookieKey + plainTextPassword).digest("hex") === storedHash;
  }

  private async hashPassword(plainTextPassword: string) {
    return hash(plainTextPassword, 10);
  }

  private async upgradePasswordHash(customerId: number, plainTextPassword: string) {
    const pool = await this.getPool();
    const config = await this.getConfig();
    const hashedPassword = await this.hashPassword(plainTextPassword);

    await pool.execute(
      `
        UPDATE \`${config.prefix}customer\`
        SET passwd = ?, date_upd = ?
        WHERE id_customer = ?
      `,
      [hashedPassword, this.formatDate(new Date()), customerId]
    );
  }

  private mapCustomer(customer: CustomerRow): SessionUser {
    return {
      id: String(customer.id_customer),
      email: customer.email,
      name: `${customer.firstname} ${customer.lastname}`.trim(),
      role: "buyer"
    };
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }
}
