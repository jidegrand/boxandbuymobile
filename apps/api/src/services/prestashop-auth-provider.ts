import type { LoginPayload, RegisterPayload, SessionUser } from "@boxandbuy/contracts";

import { createHash, randomBytes } from "node:crypto";

import { compare, hash } from "bcryptjs";
import mysql from "mysql2/promise";

import { AuthProviderError, type AuthProvider } from "./auth-provider";
import {
  getPrestashopConfig,
  getPrestashopContext,
  getPrestashopPool
} from "./prestashop-context";

type CustomerRow = {
  id_customer: number;
  email: string;
  firstname: string;
  lastname: string;
  active: number;
  passwd: string;
};

export class PrestashopAuthProvider implements AuthProvider {
  async login(payload: LoginPayload): Promise<SessionUser | null> {
    const customer = await this.findCustomerByEmail(payload.email);

    if (!customer) {
      return null;
    }

    const config = await getPrestashopConfig();
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

    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
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
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
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
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
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
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
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
