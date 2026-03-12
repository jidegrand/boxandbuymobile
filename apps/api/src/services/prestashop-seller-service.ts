import type { SessionUser, SellerRole } from "@boxandbuy/contracts";

import mysql from "mysql2/promise";

import {
  getPrestashopConfig,
  getPrestashopContext,
  getPrestashopPool
} from "./prestashop-context";

type SellerLookupRow = {
  id_seller: number;
  id_customer: number;
  shop_name: string | null;
  seller_email: string | null;
  seller_firstname: string | null;
  seller_lastname: string | null;
};

export type SellerSessionClaims = {
  sellerId: string;
  userSub: string;
  role: SellerRole;
  storeIds: string[];
  displayName: string;
  email: string;
};

export class PrestashopSellerService {
  async resolveSessionForUser(user: SessionUser): Promise<SellerSessionClaims | null> {
    const customerId = this.parseCustomerId(user.id);
    const owner = await this.findOwnerSeller(customerId);

    if (owner) {
      return this.mapClaims(user, owner, "owner");
    }

    const manager = await this.findManagedSeller(user.email);

    if (!manager) {
      return null;
    }

    return this.mapClaims(user, manager, "manager");
  }

  private async findOwnerSeller(customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          seller.id_seller,
          seller.id_customer,
          seller_lang.shop_name,
          customer.email AS seller_email,
          customer.firstname AS seller_firstname,
          customer.lastname AS seller_lastname
        FROM \`${config.prefix}ets_mp_seller\` seller
        LEFT JOIN \`${config.prefix}ets_mp_seller_lang\` seller_lang
          ON seller_lang.id_seller = seller.id_seller
          AND seller_lang.id_lang = ?
        LEFT JOIN \`${config.prefix}customer\` customer
          ON customer.id_customer = seller.id_customer
        WHERE seller.id_customer = ?
          AND seller.id_shop = ?
        ORDER BY seller.id_seller DESC
        LIMIT 1
      `,
      [context.defaultLanguageId, customerId, context.defaultShopId]
    );

    return (rows[0] as SellerLookupRow | undefined) ?? null;
  }

  private async findManagedSeller(email: string) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          seller.id_seller,
          seller.id_customer,
          seller_lang.shop_name,
          owner.email AS seller_email,
          owner.firstname AS seller_firstname,
          owner.lastname AS seller_lastname
        FROM \`${config.prefix}ets_mp_seller_manager\` manager
        INNER JOIN \`${config.prefix}ets_mp_seller\` seller
          ON seller.id_customer = manager.id_customer
          AND seller.id_shop = ?
        LEFT JOIN \`${config.prefix}ets_mp_seller_lang\` seller_lang
          ON seller_lang.id_seller = seller.id_seller
          AND seller_lang.id_lang = ?
        LEFT JOIN \`${config.prefix}customer\` owner
          ON owner.id_customer = seller.id_customer
        WHERE manager.email = ?
          AND manager.active = 1
        ORDER BY seller.id_seller DESC
        LIMIT 1
      `,
      [context.defaultShopId, context.defaultLanguageId, email.trim().toLowerCase()]
    );

    return (rows[0] as SellerLookupRow | undefined) ?? null;
  }

  private mapClaims(user: SessionUser, row: SellerLookupRow, role: SellerRole): SellerSessionClaims {
    const storeId = `ps-seller-${row.id_seller}-main`;
    const ownerName = `${row.seller_firstname ?? ""} ${row.seller_lastname ?? ""}`.trim();
    const displayName = row.shop_name?.trim() || user.name?.trim() || ownerName || `Seller ${row.id_seller}`;

    return {
      sellerId: `ps-seller-${row.id_seller}`,
      userSub: `ps-customer-${this.parseCustomerId(user.id)}`,
      role,
      storeIds: [storeId],
      displayName,
      email: user.email
    };
  }

  private parseCustomerId(value: string) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new Error("Invalid customer identifier.");
    }

    return parsed;
  }
}
