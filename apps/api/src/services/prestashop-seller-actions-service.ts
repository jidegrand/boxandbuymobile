import { randomBytes } from "node:crypto";

import type {
  SellerActionPermissions,
  SellerAuditLogResponse,
  SellerMessage,
  SellerMessageReplyInput,
  SellerMessageReplyResponse,
  SellerMessageSenderRole,
  SellerMessageThread,
  SellerMessageThreadResponse,
  SellerMessageThreadsResponse,
  SellerPayoutMethod,
  SellerPayoutOverviewResponse,
  SellerPayoutRequestInput,
  SellerPayoutRequestResponse,
  SellerPayoutRequestSummary,
  SellerProfile,
  SellerProfileMutationResponse,
  SellerProfileResponse,
  SellerProfileUpdateInput,
  SellerVerificationStatus,
  SessionUser
} from "@boxandbuy/contracts";
import mysql from "mysql2/promise";

import { getPrestashopConfig, getPrestashopContext, getPrestashopPool } from "./prestashop-context";
import {
  type MarketplaceSellerAccess,
  PrestashopSellerService
} from "./prestashop-seller-service";
import { SellerActionAuditLog } from "./seller-action-audit-log";

type SellerProfileRow = {
  id_seller: number;
  id_customer: number;
  shop_phone: string | null;
  vat_number: string | null;
  link_facebook: string | null;
  link_google: string | null;
  link_instagram: string | null;
  link_twitter: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  verification_status: number | null;
  verification_expires_at: string | Date | null;
  date_upd: string | Date | null;
  shop_name: string | null;
  shop_description: string | null;
  shop_address: string | null;
  banner_url: string | null;
  vacation_notifications: string | null;
  owner_email: string | null;
  owner_name: string | null;
};

type SellerLanguageRow = {
  id_lang: number;
};

type OrderThreadSummaryRow = {
  id_order: number;
  id_customer_thread: number;
  reference: string | null;
  customer_name: string | null;
  customer_email: string | null;
  last_message_at: string | Date | null;
  last_message: string | null;
  unread_count: string | number | null;
};

type ContactThreadSummaryRow = {
  id_contact: number;
  title: string | null;
  customer_name: string | null;
  customer_email: string | null;
  last_message_at: string | Date | null;
  last_message: string | null;
  unread_count: string | number | null;
};

type OrderHeaderRow = {
  id_order: number;
  reference: string | null;
  id_customer: number;
  customer_name: string | null;
  customer_email: string | null;
};

type OrderThreadRow = {
  id_customer_thread: number;
};

type OrderMessageRow = {
  id_customer_message: number;
  message: string | null;
  private: number | boolean | null;
  date_add: string | Date | null;
  id_manager: number | null;
  manager_name: string | null;
  id_customer: number | null;
};

type ContactHeaderRow = {
  id_contact: number;
  id_customer: number | null;
  name: string | null;
  email: string | null;
  title: string | null;
};

type ContactMessageRow = {
  id_message: number;
  message: string | null;
  date_add: string | Date | null;
  id_customer: number | null;
  id_manager: number | null;
  id_employee: number | null;
  id_seller: number | null;
  customer_name: string | null;
  manager_name: string | null;
  owner_name: string | null;
};

type ConfigRow = {
  name: string;
  value: string | null;
};

type PaymentMethodRow = {
  id_ets_mp_payment_method: number;
  title: string | null;
  description: string | null;
  note: string | null;
  fee_type: string | null;
  fee_fixed: string | number | null;
  fee_percent: string | number | null;
  estimated_processing_time: string | number | null;
};

type PaymentMethodFieldRow = {
  id_ets_mp_payment_method: number;
  id_ets_mp_payment_method_field: number;
  title: string | null;
  description: string | null;
  type: string | null;
  required: number | boolean | null;
};

type WithdrawalFieldHistoryRow = {
  id_ets_mp_payment_method_field: number;
  value: string | null;
};

type RecentPayoutRow = {
  id_ets_mp_withdrawal: number;
  amount: string | number;
  fee: string | number;
  status: number;
  title: string | null;
  reference: string | null;
  note: string | null;
  date_add: string | Date | null;
  processing_date: string | Date | null;
};

const verificationStatusMap = {
  notSubmitted: 0,
  pending: 1,
  approved: 2,
  rejected: 3,
  expired: 4
} as const;

const unsupportedPayoutReason = "This payout method still requires file upload and must be completed on the web.";

export class SellerActionServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "seller_unavailable"
      | "forbidden"
      | "invalid_payload"
      | "not_found"
      | "verification_required"
      | "mobile_unsupported"
      | "rate_limited"
      | "unexpected",
    readonly statusCode =
      code === "forbidden" || code === "seller_unavailable" || code === "verification_required"
        ? 403
        : code === "not_found"
          ? 404
          : code === "rate_limited"
            ? 429
            : code === "mobile_unsupported"
              ? 409
              : 400
  ) {
    super(message);
    this.name = "SellerActionServiceError";
  }
}

class MutationRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  assertAllowed(key: string, limit: number, windowMs: number, message: string) {
    const now = Date.now();
    const active = (this.buckets.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);

    if (active.length >= limit) {
      throw new SellerActionServiceError(message, "rate_limited", 429);
    }

    active.push(now);
    this.buckets.set(key, active);
  }
}

const mutationRateLimiter = new MutationRateLimiter();

export class PrestashopSellerActionsService {
  constructor(
    private readonly sellerService = new PrestashopSellerService(),
    private readonly auditLog = new SellerActionAuditLog()
  ) {}

  async getProfile(user: SessionUser): Promise<SellerProfileResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "profile");

    const profile = await this.loadProfile(access);
    return {
      profile,
      permissions: this.getPermissions(access)
    };
  }

  async updateProfile(user: SessionUser, input: SellerProfileUpdateInput): Promise<SellerProfileMutationResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "profile");
    mutationRateLimiter.assertAllowed(
      `profile:${access.sellerNumericId}:${access.actorCustomerId}`,
      6,
      10 * 60 * 1000,
      "Too many profile updates were submitted. Please wait a few minutes before trying again."
    );

    const normalized = this.normalizeProfileInput(input);
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const languages = await this.getActiveLanguages();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
          UPDATE \`${config.prefix}ets_mp_seller\`
          SET
            shop_phone = ?,
            vat_number = ?,
            link_facebook = ?,
            link_google = ?,
            link_instagram = ?,
            link_twitter = ?,
            latitude = ?,
            longitude = ?,
            date_upd = ?
          WHERE id_seller = ?
          LIMIT 1
        `,
        [
          normalized.shopPhone,
          normalized.vatNumber ?? null,
          normalized.linkFacebook ?? null,
          normalized.linkGoogle ?? null,
          normalized.linkInstagram ?? null,
          normalized.linkTwitter ?? null,
          normalized.latitude,
          normalized.longitude,
          this.toMysqlDateTime(new Date()),
          access.sellerNumericId
        ]
      );

      for (const language of languages) {
        await connection.execute(
          `
            INSERT INTO \`${config.prefix}ets_mp_seller_lang\` (
              id_seller,
              id_lang,
              shop_name,
              shop_description,
              shop_address,
              banner_url,
              vacation_notifications
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              shop_name = VALUES(shop_name),
              shop_description = VALUES(shop_description),
              shop_address = VALUES(shop_address),
              banner_url = VALUES(banner_url),
              vacation_notifications = VALUES(vacation_notifications)
          `,
          [
            access.sellerNumericId,
            language.id_lang,
            normalized.shopName,
            normalized.shopDescription,
            normalized.shopAddress,
            normalized.bannerUrl ?? null,
            normalized.vacationNotice ?? null
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const profile = await this.loadProfile(access);
    const audit = await this.auditLog.record({
      sellerNumericId: access.sellerNumericId,
      actorUserId: user.id,
      actorRole: access.role,
      actorName: this.getActorName(access),
      action: "profile_updated",
      summary: `Updated seller profile for ${profile.shopName}.`,
      metadata: {
        shopName: profile.shopName,
        sellerId: profile.sellerId
      }
    });

    return {
      message: "Seller profile updated successfully.",
      profile,
      permissions: this.getPermissions(access),
      audit
    };
  }

  async listMessageThreads(user: SessionUser): Promise<SellerMessageThreadsResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "messages");

    const [orderThreads, contactThreads] = await Promise.all([
      this.loadOrderThreads(access),
      this.loadContactThreads(access)
    ]);

    return {
      items: [...orderThreads, ...contactThreads].sort((left, right) =>
        right.lastMessageAt.localeCompare(left.lastMessageAt)
      ),
      permissions: this.getPermissions(access)
    };
  }

  async getMessageThread(user: SessionUser, threadId: string): Promise<SellerMessageThreadResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "messages");

    const thread = await this.loadMessageThread(access, threadId);
    if (!thread) {
      throw new SellerActionServiceError("Seller message thread not found.", "not_found", 404);
    }

    return {
      thread,
      permissions: this.getPermissions(access)
    };
  }

  async replyToMessageThread(
    user: SessionUser,
    threadId: string,
    input: SellerMessageReplyInput
  ): Promise<SellerMessageReplyResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "messages");
    mutationRateLimiter.assertAllowed(
      `message:${access.sellerNumericId}:${access.actorCustomerId}`,
      8,
      60 * 1000,
      "Too many seller replies were submitted. Please wait a minute before trying again."
    );

    const thread = await this.insertReply(access, threadId, input);
    const audit = await this.auditLog.record({
      sellerNumericId: access.sellerNumericId,
      actorUserId: user.id,
      actorRole: access.role,
      actorName: this.getActorName(access),
      action: "message_replied",
      summary: `Replied to ${thread.type} thread ${thread.subject}.`,
      metadata: {
        threadId: thread.id,
        threadType: thread.type
      }
    });

    return {
      message: "Seller reply sent successfully.",
      thread,
      permissions: this.getPermissions(access),
      audit
    };
  }

  async getPayoutOverview(user: SessionUser): Promise<SellerPayoutOverviewResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "withdraw");

    return this.loadPayoutOverview(access);
  }

  async requestPayout(user: SessionUser, input: SellerPayoutRequestInput): Promise<SellerPayoutRequestResponse> {
    const access = await this.requireAccess(user);
    this.ensurePermission(access, "withdraw");
    mutationRateLimiter.assertAllowed(
      `payout:${access.sellerNumericId}:${access.actorCustomerId}`,
      3,
      60 * 60 * 1000,
      "Too many payout requests were submitted. Please wait before creating another request."
    );

    const overview = await this.loadPayoutOverview(access);
    if (!overview.summary.canRequestPayout) {
      throw new SellerActionServiceError(
        "Seller verification approval is required before requesting a payout.",
        "verification_required",
        403
      );
    }

    const paymentMethod = overview.methods.find((method) => method.id === input.paymentMethodId);
    if (!paymentMethod) {
      throw new SellerActionServiceError("The selected payout method is invalid.", "invalid_payload", 400);
    }

    if (!paymentMethod.supportsMobileSubmission) {
      throw new SellerActionServiceError(
        paymentMethod.blockedReason ?? unsupportedPayoutReason,
        "mobile_unsupported",
        409
      );
    }

    const amount = this.roundPrice(input.amount);
    const fee = this.calculatePayoutFee(paymentMethod, amount);
    const available = this.roundPrice(overview.summary.availableBalance);
    const minimumAmount = overview.summary.minimumAmount ?? null;
    const maximumAmount = overview.summary.maximumAmount ?? null;

    if (amount <= 0) {
      throw new SellerActionServiceError("Payout amount must be greater than zero.", "invalid_payload", 400);
    }

    if (amount <= fee) {
      throw new SellerActionServiceError(
        "Payout amount must be greater than the payout fee.",
        "invalid_payload",
        400
      );
    }

    if (amount > available) {
      throw new SellerActionServiceError(
        "Payout amount is greater than the available seller balance.",
        "invalid_payload",
        400
      );
    }

    if (maximumAmount !== null && amount > maximumAmount) {
      throw new SellerActionServiceError(
        "Payout amount exceeds the configured maximum withdrawal limit.",
        "invalid_payload",
        400
      );
    }

    if (minimumAmount !== null && amount < minimumAmount) {
      throw new SellerActionServiceError(
        "Payout amount is below the configured minimum withdrawal limit.",
        "invalid_payload",
        400
      );
    }

    const normalizedFields = this.normalizePayoutFields(paymentMethod, input.fields ?? {});
    const createdRequest = await this.createPayoutRequest(access, paymentMethod, amount, fee, normalizedFields);
    const audit = await this.auditLog.record({
      sellerNumericId: access.sellerNumericId,
      actorUserId: user.id,
      actorRole: access.role,
      actorName: this.getActorName(access),
      action: "payout_requested",
      summary: `Requested payout ${amount.toFixed(2)} via ${paymentMethod.title}.`,
      metadata: {
        paymentMethod: paymentMethod.title,
        amount: amount.toFixed(2)
      }
    });

    return {
      message: "Payout request submitted successfully.",
      request: createdRequest,
      permissions: this.getPermissions(access),
      audit
    };
  }

  async getAuditLog(user: SessionUser): Promise<SellerAuditLogResponse> {
    const access = await this.requireAccess(user);
    const permissions = this.getPermissions(access);

    if (!permissions.canViewAuditLog) {
      throw new SellerActionServiceError(
        "You do not have permission to review seller action logs.",
        "forbidden",
        403
      );
    }

    return {
      items: await this.auditLog.listForSeller(access.sellerNumericId),
      permissions
    };
  }

  private async requireAccess(user: SessionUser) {
    const access = await this.sellerService.resolveMarketplaceAccessForUser(user);

    if (!access) {
      throw new SellerActionServiceError(
        "Seller actions are not available for this account.",
        "seller_unavailable",
        403
      );
    }

    return access;
  }

  private getPermissions(access: MarketplaceSellerAccess): SellerActionPermissions {
    const canManageProfile = this.hasControllerPermission(access, "profile");
    const canManageMessages = this.hasControllerPermission(access, "messages");
    const canRequestPayouts = this.hasControllerPermission(access, "withdraw");

    return {
      canManageProfile,
      canManageMessages,
      canRequestPayouts,
      canViewAuditLog: access.role === "owner" || canManageProfile || canManageMessages || canRequestPayouts
    };
  }

  private ensurePermission(access: MarketplaceSellerAccess, controller: "profile" | "messages" | "withdraw") {
    if (!this.hasControllerPermission(access, controller)) {
      throw new SellerActionServiceError(
        "You do not have permission to perform this seller action.",
        "forbidden",
        403
      );
    }
  }

  private hasControllerPermission(access: MarketplaceSellerAccess, controller: string) {
    if (access.role === "owner") {
      return true;
    }

    if (access.role === "analyst") {
      return false;
    }

    if (controller === "shop") {
      return true;
    }

    const permissions = access.managerPermissions;
    return (
      permissions.includes(controller) ||
      (permissions.includes("all") && !["manager", "shop", "voucher", "withdraw"].includes(controller))
    );
  }

  private async loadProfile(access: MarketplaceSellerAccess): Promise<SellerProfile> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          seller.id_seller,
          seller.id_customer,
          seller.shop_phone,
          seller.vat_number,
          seller.link_facebook,
          seller.link_google,
          seller.link_instagram,
          seller.link_twitter,
          seller.latitude,
          seller.longitude,
          seller.verification_status,
          seller.verification_expires_at,
          seller.date_upd,
          seller_lang.shop_name,
          seller_lang.shop_description,
          seller_lang.shop_address,
          seller_lang.banner_url,
          seller_lang.vacation_notifications,
          owner.email AS owner_email,
          CONCAT(owner.firstname, ' ', owner.lastname) AS owner_name
        FROM \`${config.prefix}ets_mp_seller\` seller
        LEFT JOIN \`${config.prefix}ets_mp_seller_lang\` seller_lang
          ON seller_lang.id_seller = seller.id_seller
          AND seller_lang.id_lang = ?
        LEFT JOIN \`${config.prefix}customer\` owner
          ON owner.id_customer = seller.id_customer
        WHERE seller.id_seller = ?
        LIMIT 1
      `,
      [context.defaultLanguageId, access.sellerNumericId]
    );

    const row = rows[0] as SellerProfileRow | undefined;
    if (!row) {
      throw new SellerActionServiceError("Seller profile could not be loaded.", "not_found", 404);
    }

    return {
      sellerId: access.sellerId,
      role: access.role,
      displayName: access.displayName,
      ownerName: row.owner_name?.trim() || access.displayName,
      ownerEmail: row.owner_email ?? access.email,
      shopName: row.shop_name?.trim() || access.displayName,
      shopDescription: row.shop_description?.trim() || "",
      shopAddress: row.shop_address?.trim() || "",
      shopPhone: row.shop_phone?.trim() || "",
      vatNumber: this.optionalText(row.vat_number),
      bannerUrl: this.optionalText(row.banner_url),
      linkFacebook: this.optionalText(row.link_facebook),
      linkGoogle: this.optionalText(row.link_google),
      linkInstagram: this.optionalText(row.link_instagram),
      linkTwitter: this.optionalText(row.link_twitter),
      latitude: this.optionalNumber(row.latitude),
      longitude: this.optionalNumber(row.longitude),
      vacationNotice: this.optionalText(row.vacation_notifications),
      verificationStatus: this.mapVerificationStatus(row.verification_status, row.verification_expires_at),
      verificationExpiresAt: this.normalizeDateTime(row.verification_expires_at),
      updatedAt: this.normalizeDateTime(row.date_upd)
    };
  }

  private async getActiveLanguages() {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_lang
        FROM \`${config.prefix}lang\`
        WHERE active = 1
      `
    );

    const languages = (rows as SellerLanguageRow[]).map((row) => ({ id_lang: row.id_lang }));
    if (languages.length) {
      return languages;
    }

    const context = await getPrestashopContext();
    return [{ id_lang: context.defaultLanguageId }];
  }

  private normalizeProfileInput(input: SellerProfileUpdateInput) {
    const shopPhone = input.shopPhone.trim();
    if (!this.isValidPhone(shopPhone)) {
      throw new SellerActionServiceError("Shop phone number is not valid.", "invalid_payload", 400);
    }

    const bannerUrl = this.optionalText(input.bannerUrl);
    const linkFacebook = this.optionalText(input.linkFacebook);
    const linkGoogle = this.optionalText(input.linkGoogle);
    const linkInstagram = this.optionalText(input.linkInstagram);
    const linkTwitter = this.optionalText(input.linkTwitter);

    for (const [label, value] of [
      ["Banner URL", bannerUrl],
      ["Facebook link", linkFacebook],
      ["Google link", linkGoogle],
      ["Instagram link", linkInstagram],
      ["Twitter link", linkTwitter]
    ] as const) {
      if (value && !this.isValidUrl(value)) {
        throw new SellerActionServiceError(`${label} is not valid.`, "invalid_payload", 400);
      }
    }

    const latitude = this.parseOptionalCoordinate(input.latitude);
    const longitude = this.parseOptionalCoordinate(input.longitude);
    if ((latitude === null) !== (longitude === null)) {
      throw new SellerActionServiceError(
        "Latitude and longitude must be provided together.",
        "invalid_payload",
        400
      );
    }

    const vatNumber = this.optionalText(input.vatNumber);
    if (vatNumber && /[<>]/.test(vatNumber)) {
      throw new SellerActionServiceError("VAT number is not valid.", "invalid_payload", 400);
    }

    const vacationNotice = this.optionalLongText(input.vacationNotice);
    if (vacationNotice && /[<>]/.test(vacationNotice)) {
      throw new SellerActionServiceError("Vacation notice is not valid.", "invalid_payload", 400);
    }

    return {
      shopName: this.requireCleanText(input.shopName, "Shop name"),
      shopDescription: this.requireCleanText(input.shopDescription, "Shop description"),
      shopAddress: this.requireCleanText(input.shopAddress, "Shop address"),
      shopPhone,
      vatNumber,
      bannerUrl,
      linkFacebook,
      linkGoogle,
      linkInstagram,
      linkTwitter,
      latitude,
      longitude,
      vacationNotice
    };
  }

  private async loadOrderThreads(access: MarketplaceSellerAccess) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          thread.id_order,
          thread.id_customer_thread,
          orders.reference,
          CONCAT(customer.firstname, ' ', customer.lastname) AS customer_name,
          customer.email AS customer_email,
          MAX(message.date_add) AS last_message_at,
          SUBSTRING_INDEX(
            GROUP_CONCAT(message.message ORDER BY message.date_add DESC SEPARATOR '\n'),
            '\n',
            1
          ) AS last_message,
          SUM(CASE WHEN message.private = 0 AND COALESCE(message.read, 0) = 0 THEN 1 ELSE 0 END) AS unread_count
        FROM \`${config.prefix}customer_thread\` thread
        INNER JOIN \`${config.prefix}ets_mp_seller_order\` seller_order
          ON seller_order.id_order = thread.id_order
          AND seller_order.id_customer = ?
        INNER JOIN \`${config.prefix}orders\` orders
          ON orders.id_order = thread.id_order
        INNER JOIN \`${config.prefix}customer\` customer
          ON customer.id_customer = orders.id_customer
        INNER JOIN \`${config.prefix}customer_message\` message
          ON message.id_customer_thread = thread.id_customer_thread
        GROUP BY
          thread.id_order,
          thread.id_customer_thread,
          orders.reference,
          customer_name,
          customer.email
        ORDER BY last_message_at DESC
        LIMIT 25
      `,
      [access.ownerCustomerId]
    );

    return (rows as OrderThreadSummaryRow[])
      .filter((row) => row.last_message_at)
      .map((row) => ({
        id: `order-${row.id_order}`,
        externalId: String(row.id_order),
        type: "order" as const,
        subject: row.reference ? `Order ${row.reference}` : `Order ${row.id_order}`,
        preview: this.truncatePreview(row.last_message),
        lastMessageAt: this.normalizeDateTime(row.last_message_at) ?? new Date(0).toISOString(),
        unreadCount: this.toInteger(row.unread_count),
        customerName: this.optionalText(row.customer_name),
        customerEmail: this.optionalText(row.customer_email),
        orderReference: this.optionalText(row.reference)
      }));
  }

  private async loadContactThreads(access: MarketplaceSellerAccess) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          contact.id_contact,
          first_message.title,
          CASE
            WHEN contact.id_customer IS NOT NULL AND contact.id_customer > 0
              THEN CONCAT(customer.firstname, ' ', customer.lastname)
            ELSE contact.name
          END AS customer_name,
          CASE
            WHEN contact.id_customer IS NOT NULL AND contact.id_customer > 0
              THEN customer.email
            ELSE contact.email
          END AS customer_email,
          last_message.date_add AS last_message_at,
          last_message.message AS last_message,
          SUM(CASE WHEN COALESCE(all_messages.read, 0) = 0 THEN 1 ELSE 0 END) AS unread_count
        FROM \`${config.prefix}ets_mp_seller_contact\` contact
        LEFT JOIN \`${config.prefix}customer\` customer
          ON customer.id_customer = contact.id_customer
        LEFT JOIN \`${config.prefix}ets_mp_seller_contact_message\` first_message
          ON first_message.id_message = (
            SELECT sub_first.id_message
            FROM \`${config.prefix}ets_mp_seller_contact_message\` sub_first
            WHERE sub_first.id_contact = contact.id_contact
            ORDER BY sub_first.id_message ASC
            LIMIT 1
          )
        LEFT JOIN \`${config.prefix}ets_mp_seller_contact_message\` last_message
          ON last_message.id_message = (
            SELECT sub_last.id_message
            FROM \`${config.prefix}ets_mp_seller_contact_message\` sub_last
            WHERE sub_last.id_contact = contact.id_contact
            ORDER BY sub_last.id_message DESC
            LIMIT 1
          )
        LEFT JOIN \`${config.prefix}ets_mp_seller_contact_message\` all_messages
          ON all_messages.id_contact = contact.id_contact
        WHERE contact.id_seller = ?
        GROUP BY
          contact.id_contact,
          first_message.title,
          customer_name,
          customer_email,
          last_message_at,
          last_message
        ORDER BY last_message_at DESC
        LIMIT 25
      `,
      [access.sellerNumericId]
    );

    return (rows as ContactThreadSummaryRow[])
      .filter((row) => row.last_message_at)
      .map((row) => ({
        id: `contact-${row.id_contact}`,
        externalId: String(row.id_contact),
        type: "contact" as const,
        subject: row.title?.trim() || `Contact ${row.id_contact}`,
        preview: this.truncatePreview(row.last_message),
        lastMessageAt: this.normalizeDateTime(row.last_message_at) ?? new Date(0).toISOString(),
        unreadCount: this.toInteger(row.unread_count),
        customerName: this.optionalText(row.customer_name),
        customerEmail: this.optionalText(row.customer_email)
      }));
  }

  private async loadMessageThread(access: MarketplaceSellerAccess, threadId: string): Promise<SellerMessageThread | null> {
    const parsed = this.parseThreadId(threadId);
    return parsed.type === "order"
      ? this.loadOrderThreadDetail(access, parsed.numericId)
      : this.loadContactThreadDetail(access, parsed.numericId);
  }

  private async loadOrderThreadDetail(access: MarketplaceSellerAccess, orderId: number): Promise<SellerMessageThread | null> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [headerRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          orders.id_order,
          orders.reference,
          orders.id_customer,
          CONCAT(customer.firstname, ' ', customer.lastname) AS customer_name,
          customer.email AS customer_email
        FROM \`${config.prefix}orders\` orders
        INNER JOIN \`${config.prefix}ets_mp_seller_order\` seller_order
          ON seller_order.id_order = orders.id_order
          AND seller_order.id_customer = ?
        INNER JOIN \`${config.prefix}customer\` customer
          ON customer.id_customer = orders.id_customer
        WHERE orders.id_order = ?
        LIMIT 1
      `,
      [access.ownerCustomerId, orderId]
    );

    const header = headerRows[0] as OrderHeaderRow | undefined;
    if (!header) {
      return null;
    }

    const [threadRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_customer_thread
        FROM \`${config.prefix}customer_thread\`
        WHERE id_order = ?
        ORDER BY id_customer_thread ASC
        LIMIT 1
      `,
      [orderId]
    );

    const threadRow = threadRows[0] as OrderThreadRow | undefined;
    const messages =
      threadRow?.id_customer_thread !== undefined
        ? await this.loadOrderMessages(threadRow.id_customer_thread, header, access)
        : [];

    if (threadRow?.id_customer_thread) {
      await pool.execute(
        `
          UPDATE \`${config.prefix}customer_message\`
          SET \`read\` = 1
          WHERE id_customer_thread = ?
        `,
        [threadRow.id_customer_thread]
      );
    }

    return {
      id: `order-${header.id_order}`,
      externalId: String(header.id_order),
      type: "order",
      subject: header.reference ? `Order ${header.reference}` : `Order ${header.id_order}`,
      preview: messages.length ? this.truncatePreview(messages[messages.length - 1].body) : undefined,
      lastMessageAt:
        messages[messages.length - 1]?.createdAt ?? this.toMysqlDateTime(new Date()),
      unreadCount: 0,
      customerName: this.optionalText(header.customer_name),
      customerEmail: this.optionalText(header.customer_email),
      orderReference: this.optionalText(header.reference),
      messages
    };
  }

  private async loadOrderMessages(
    customerThreadId: number,
    header: OrderHeaderRow,
    access: MarketplaceSellerAccess
  ): Promise<SellerMessage[]> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          message.id_customer_message,
          message.message,
          message.private,
          message.date_add,
          seller_message.id_manager,
          CONCAT(manager.firstname, ' ', manager.lastname) AS manager_name,
          seller_message.id_customer
        FROM \`${config.prefix}customer_message\` message
        LEFT JOIN \`${config.prefix}ets_mp_seller_customer_message\` seller_message
          ON seller_message.id_customer_message = message.id_customer_message
        LEFT JOIN \`${config.prefix}customer\` manager
          ON manager.id_customer = seller_message.id_manager
        WHERE message.id_customer_thread = ?
        ORDER BY message.date_add ASC, message.id_customer_message ASC
      `,
      [customerThreadId]
    );

    return (rows as OrderMessageRow[]).map((row) => {
      const senderRole = row.id_manager
        ? "manager"
        : row.id_customer
          ? "seller"
          : "customer";

      const senderName =
        senderRole === "manager"
          ? row.manager_name?.trim() || access.displayName
          : senderRole === "seller"
            ? access.displayName
            : header.customer_name?.trim() || "Customer";

      return {
        id: `order-message-${row.id_customer_message}`,
        senderName,
        senderRole,
        body: row.message?.trim() || "",
        createdAt: this.normalizeDateTime(row.date_add) ?? this.toMysqlDateTime(new Date()),
        visibility: row.private ? "private" : "public"
      };
    });
  }

  private async loadContactThreadDetail(
    access: MarketplaceSellerAccess,
    contactId: number
  ): Promise<SellerMessageThread | null> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [headerRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          contact.id_contact,
          contact.id_customer,
          contact.name,
          contact.email,
          first_message.title
        FROM \`${config.prefix}ets_mp_seller_contact\` contact
        LEFT JOIN \`${config.prefix}ets_mp_seller_contact_message\` first_message
          ON first_message.id_message = (
            SELECT sub_first.id_message
            FROM \`${config.prefix}ets_mp_seller_contact_message\` sub_first
            WHERE sub_first.id_contact = contact.id_contact
            ORDER BY sub_first.id_message ASC
            LIMIT 1
          )
        WHERE contact.id_contact = ?
          AND contact.id_seller = ?
        LIMIT 1
      `,
      [contactId, access.sellerNumericId]
    );

    const header = headerRows[0] as ContactHeaderRow | undefined;
    if (!header) {
      return null;
    }

    await pool.execute(
      `
        UPDATE \`${config.prefix}ets_mp_seller_contact_message\`
        SET \`read\` = 1
        WHERE id_contact = ?
      `,
      [contactId]
    );

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          message.id_message,
          message.message,
          message.date_add,
          message.id_customer,
          message.id_manager,
          message.id_employee,
          message.id_seller,
          CONCAT(customer.firstname, ' ', customer.lastname) AS customer_name,
          CONCAT(manager.firstname, ' ', manager.lastname) AS manager_name,
          CONCAT(owner.firstname, ' ', owner.lastname) AS owner_name
        FROM \`${config.prefix}ets_mp_seller_contact_message\` message
        LEFT JOIN \`${config.prefix}customer\` customer
          ON customer.id_customer = message.id_customer
        LEFT JOIN \`${config.prefix}customer\` manager
          ON manager.id_customer = message.id_manager
        LEFT JOIN \`${config.prefix}ets_mp_seller\` seller
          ON seller.id_seller = message.id_seller
        LEFT JOIN \`${config.prefix}customer\` owner
          ON owner.id_customer = seller.id_customer
        WHERE message.id_contact = ?
        ORDER BY message.date_add ASC, message.id_message ASC
      `,
      [contactId]
    );

    const messages: SellerMessage[] = (rows as ContactMessageRow[]).map((row) => {
      let senderRole: SellerMessageSenderRole = "guest";
      let senderName = header.name?.trim() || "Contact";

      if (row.id_manager) {
        senderRole = "manager";
        senderName = row.manager_name?.trim() || access.displayName;
      } else if (row.id_employee) {
        senderRole = "employee";
        senderName = "BoxAndBuy support";
      } else if (row.id_customer) {
        senderRole = "customer";
        senderName = row.customer_name?.trim() || header.name?.trim() || "Customer";
      } else if (row.id_seller) {
        senderRole = "seller";
        senderName = row.owner_name?.trim() || access.displayName;
      }

      return {
        id: `contact-message-${row.id_message}`,
        senderName,
        senderRole,
        body: row.message?.trim() || "",
        createdAt: this.normalizeDateTime(row.date_add) ?? this.toMysqlDateTime(new Date()),
        visibility: "public" as const
      };
    });

    return {
      id: `contact-${header.id_contact}`,
      externalId: String(header.id_contact),
      type: "contact",
      subject: header.title?.trim() || `Contact ${header.id_contact}`,
      preview: messages.length ? this.truncatePreview(messages[messages.length - 1].body) : undefined,
      lastMessageAt:
        messages[messages.length - 1]?.createdAt ?? this.toMysqlDateTime(new Date()),
      unreadCount: 0,
      customerName: this.optionalText(header.name),
      customerEmail: this.optionalText(header.email),
      messages
    };
  }

  private async insertReply(
    access: MarketplaceSellerAccess,
    threadId: string,
    input: SellerMessageReplyInput
  ): Promise<SellerMessageThread> {
    const parsed = this.parseThreadId(threadId);
    return parsed.type === "order"
      ? this.insertOrderReply(access, parsed.numericId, input)
      : this.insertContactReply(access, parsed.numericId, input);
  }

  private async insertOrderReply(
    access: MarketplaceSellerAccess,
    orderId: number,
    input: SellerMessageReplyInput
  ) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const body = this.requireCleanText(input.message, "Message");
    const [headerRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          orders.id_order,
          orders.reference,
          orders.id_customer,
          CONCAT(customer.firstname, ' ', customer.lastname) AS customer_name,
          customer.email AS customer_email
        FROM \`${config.prefix}orders\` orders
        INNER JOIN \`${config.prefix}ets_mp_seller_order\` seller_order
          ON seller_order.id_order = orders.id_order
          AND seller_order.id_customer = ?
        INNER JOIN \`${config.prefix}customer\` customer
          ON customer.id_customer = orders.id_customer
        WHERE orders.id_order = ?
        LIMIT 1
      `,
      [access.ownerCustomerId, orderId]
    );

    const header = headerRows[0] as OrderHeaderRow | undefined;
    if (!header) {
      throw new SellerActionServiceError("Seller order thread was not found.", "not_found", 404);
    }

    const connection = await pool.getConnection();
    let customerThreadId = 0;

    try {
      await connection.beginTransaction();

      const [threadRows] = await connection.execute<mysql.RowDataPacket[]>(
        `
          SELECT id_customer_thread
          FROM \`${config.prefix}customer_thread\`
          WHERE id_order = ?
          ORDER BY id_customer_thread ASC
          LIMIT 1
        `,
        [orderId]
      );

      const thread = threadRows[0] as OrderThreadRow | undefined;
      if (thread) {
        customerThreadId = thread.id_customer_thread;
      } else {
        const token = randomBytes(6).toString("hex");
        const now = this.toMysqlDateTime(new Date());
        const [insertThread] = await connection.execute<mysql.ResultSetHeader>(
          `
            INSERT INTO \`${config.prefix}customer_thread\` (
              id_contact,
              id_customer,
              id_shop,
              id_order,
              id_product,
              id_lang,
              email,
              status,
              token,
              date_add,
              date_upd
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
          `,
          [
            0,
            header.id_customer,
            context.defaultShopId,
            orderId,
            0,
            context.defaultLanguageId,
            header.customer_email,
            token,
            now,
            now
          ]
        );
        customerThreadId = insertThread.insertId;
      }

      const [insertMessage] = await connection.execute<mysql.ResultSetHeader>(
        `
          INSERT INTO \`${config.prefix}customer_message\` (
            id_customer_thread,
            id_employee,
            message,
            private,
            date_add
          ) VALUES (?, ?, ?, ?, ?)
        `,
        [customerThreadId, 1, body, input.visibility === "private" ? 1 : 0, this.toMysqlDateTime(new Date())]
      );

      await connection.execute(
        `
          INSERT INTO \`${config.prefix}ets_mp_seller_customer_message\` (
            id_customer,
            id_manager,
            id_customer_message
          ) VALUES (?, ?, ?)
        `,
        [
          access.ownerCustomerId,
          access.role === "manager" ? access.actorCustomerId : 0,
          insertMessage.insertId
        ]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const thread = await this.loadOrderThreadDetail(access, orderId);
    if (!thread) {
      throw new SellerActionServiceError("Seller order thread could not be reloaded.", "unexpected", 500);
    }

    return thread;
  }

  private async insertContactReply(
    access: MarketplaceSellerAccess,
    contactId: number,
    input: SellerMessageReplyInput
  ) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const body = this.requireCleanText(input.message, "Message");
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_contact
        FROM \`${config.prefix}ets_mp_seller_contact\`
        WHERE id_contact = ?
          AND id_seller = ?
        LIMIT 1
      `,
      [contactId, access.sellerNumericId]
    );

    if (!rows.length) {
      throw new SellerActionServiceError("Seller contact thread was not found.", "not_found", 404);
    }

    await pool.execute(
      `
        INSERT INTO \`${config.prefix}ets_mp_seller_contact_message\` (
          id_contact,
          id_seller,
          id_manager,
          id_employee,
          title,
          message,
          attachment,
          attachment_name,
          \`read\`,
          customer_read,
          date_add
        ) VALUES (?, ?, ?, ?, '', ?, '', '', 1, 0, ?)
      `,
      [
        contactId,
        access.sellerNumericId,
        access.role === "manager" ? access.actorCustomerId : 0,
        0,
        body,
        this.toMysqlDateTime(new Date())
      ]
    );

    const thread = await this.loadContactThreadDetail(access, contactId);
    if (!thread) {
      throw new SellerActionServiceError("Seller contact thread could not be reloaded.", "unexpected", 500);
    }

    return thread;
  }

  private async loadPayoutOverview(access: MarketplaceSellerAccess): Promise<SellerPayoutOverviewResponse> {
    const [profile, totals, configuration, methods, recentRequests] = await Promise.all([
      this.loadProfile(access),
      this.loadPayoutTotals(access),
      this.loadPayoutConfiguration(),
      this.loadPayoutMethods(access),
      this.loadRecentPayoutRequests(access)
    ]);

    const availableBalance = this.roundPrice(totals.totalCommission - totals.totalUsed);
    const canRequestPayout = profile.verificationStatus === "approved";

    return {
      summary: {
        availableBalance,
        totalCommission: this.roundPrice(totals.totalCommission),
        totalWithdrawn: this.roundPrice(totals.totalWithdrawn),
        minimumAmount: configuration.minimumAmount,
        maximumAmount: configuration.maximumAmount,
        verificationStatus: profile.verificationStatus,
        verificationExpiresAt: profile.verificationExpiresAt,
        requiresInvoiceUpload: configuration.requiresInvoiceUpload,
        canRequestPayout
      },
      methods: methods.map((method) => ({
        ...method,
        supportsMobileSubmission: method.supportsMobileSubmission && !configuration.requiresInvoiceUpload,
        blockedReason:
          !method.supportsMobileSubmission || configuration.requiresInvoiceUpload
            ? unsupportedPayoutReason
            : method.blockedReason
      })),
      recentRequests,
      permissions: this.getPermissions(access)
    };
  }

  private async loadPayoutTotals(access: MarketplaceSellerAccess) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          COALESCE((
            SELECT SUM(commission)
            FROM \`${config.prefix}ets_mp_seller_commission\`
            WHERE id_customer = ?
              AND status = 1
          ), 0) AS total_commission,
          COALESCE((
            SELECT SUM(amount)
            FROM \`${config.prefix}ets_mp_commission_usage\`
            WHERE id_customer = ?
              AND status = 1
          ), 0) AS total_used,
          COALESCE((
            SELECT SUM(amount)
            FROM \`${config.prefix}ets_mp_commission_usage\`
            WHERE id_customer = ?
              AND status = 1
              AND id_withdraw != 0
          ), 0) AS total_withdrawn
      `,
      [access.ownerCustomerId, access.ownerCustomerId, access.ownerCustomerId]
    );

    const row = rows[0] as
      | {
          total_commission: string | number | null;
          total_used: string | number | null;
          total_withdrawn: string | number | null;
        }
      | undefined;

    return {
      totalCommission: this.toNumber(row?.total_commission),
      totalUsed: this.toNumber(row?.total_used),
      totalWithdrawn: this.toNumber(row?.total_withdrawn)
    };
  }

  private async loadPayoutConfiguration() {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT name, value
        FROM \`${config.prefix}configuration\`
        WHERE name IN (
          'ETS_MP_MAX_WITHDRAW',
          'ETS_MP_BALANCE_REQUIRED_FOR_WITHDRAW',
          'ETS_MP_WITHDRAW_INVOICE_REQUIRED'
        )
      `
    );

    const values = new Map((rows as ConfigRow[]).map((row) => [row.name, row.value ?? ""]));

    return {
      maximumAmount: values.get("ETS_MP_MAX_WITHDRAW")
        ? this.toNumber(values.get("ETS_MP_MAX_WITHDRAW"))
        : null,
      minimumAmount: values.get("ETS_MP_BALANCE_REQUIRED_FOR_WITHDRAW")
        ? this.toNumber(values.get("ETS_MP_BALANCE_REQUIRED_FOR_WITHDRAW"))
        : null,
      requiresInvoiceUpload: values.get("ETS_MP_WITHDRAW_INVOICE_REQUIRED") === "1"
    };
  }

  private async loadPayoutMethods(access: MarketplaceSellerAccess): Promise<SellerPayoutMethod[]> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [methodRows, fieldRows, historyRows] = await Promise.all([
      pool.execute<mysql.RowDataPacket[]>(
        `
          SELECT
            method.id_ets_mp_payment_method,
            method_lang.title,
            method_lang.description,
            method_lang.note,
            method.fee_type,
            method.fee_fixed,
            method.fee_percent,
            method.estimated_processing_time
          FROM \`${config.prefix}ets_mp_payment_method\` method
          LEFT JOIN \`${config.prefix}ets_mp_payment_method_lang\` method_lang
            ON method_lang.id_ets_mp_payment_method = method.id_ets_mp_payment_method
            AND method_lang.id_lang = ?
          WHERE method.id_shop = ?
            AND method.enable = 1
            AND method.deleted = 0
          ORDER BY method.sort ASC, method.id_ets_mp_payment_method ASC
        `,
        [context.defaultLanguageId, context.defaultShopId]
      ),
      pool.execute<mysql.RowDataPacket[]>(
        `
          SELECT
            field.id_ets_mp_payment_method,
            field.id_ets_mp_payment_method_field,
            field_lang.title,
            field_lang.description,
            field.type,
            field.required
          FROM \`${config.prefix}ets_mp_payment_method_field\` field
          LEFT JOIN \`${config.prefix}ets_mp_payment_method_field_lang\` field_lang
            ON field_lang.id_ets_mp_payment_method_field = field.id_ets_mp_payment_method_field
            AND field_lang.id_lang = ?
          WHERE field.enable = 1
            AND field.deleted = 0
          ORDER BY field.sort ASC, field.id_ets_mp_payment_method_field ASC
        `,
        [context.defaultLanguageId]
      ),
      pool.execute<mysql.RowDataPacket[]>(
        `
          SELECT
            withdrawal_field.id_ets_mp_payment_method_field,
            withdrawal_field.value
          FROM \`${config.prefix}ets_mp_withdrawal_field\` withdrawal_field
          INNER JOIN \`${config.prefix}ets_mp_commission_usage\` commission_usage
            ON commission_usage.id_withdraw = withdrawal_field.id_ets_mp_withdrawal
          WHERE commission_usage.id_customer = ?
          ORDER BY withdrawal_field.id_ets_mp_withdrawal DESC
        `,
        [access.ownerCustomerId]
      )
    ]);

    const lastValues = new Map<number, string>();
    for (const row of historyRows[0] as WithdrawalFieldHistoryRow[]) {
      if (!lastValues.has(row.id_ets_mp_payment_method_field) && row.value) {
        lastValues.set(row.id_ets_mp_payment_method_field, row.value);
      }
    }

    const fieldsByMethod = new Map<number, SellerPayoutMethod["fields"]>();
    for (const row of fieldRows[0] as PaymentMethodFieldRow[]) {
      const current = fieldsByMethod.get(row.id_ets_mp_payment_method) ?? [];
      current.push({
        id: String(row.id_ets_mp_payment_method_field),
        title: row.title?.trim() || `Field ${row.id_ets_mp_payment_method_field}`,
        description: this.optionalText(row.description),
        type: row.type?.trim() || "text",
        required: Boolean(row.required),
        lastValue: lastValues.get(row.id_ets_mp_payment_method_field)
      });
      fieldsByMethod.set(row.id_ets_mp_payment_method, current);
    }

    return (methodRows[0] as PaymentMethodRow[]).map((row) => {
      const fields = fieldsByMethod.get(row.id_ets_mp_payment_method) ?? [];
      const hasUnsupportedField = fields.some((field) => field.type.toLowerCase() === "file");

      return {
        id: String(row.id_ets_mp_payment_method),
        title: row.title?.trim() || `Payout method ${row.id_ets_mp_payment_method}`,
        description: this.optionalText(row.description),
        note: this.optionalText(row.note),
        feeType: this.mapFeeType(row.fee_type),
        feeFixed: this.roundPrice(this.toNumber(row.fee_fixed)),
        feePercent: this.roundPrice(this.toNumber(row.fee_percent)),
        estimatedProcessingDays: this.toInteger(row.estimated_processing_time),
        supportsMobileSubmission: !hasUnsupportedField,
        blockedReason: hasUnsupportedField ? unsupportedPayoutReason : undefined,
        fields
      };
    });
  }

  private async loadRecentPayoutRequests(access: MarketplaceSellerAccess): Promise<SellerPayoutRequestSummary[]> {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT
          withdrawal.id_ets_mp_withdrawal,
          commission_usage.amount,
          withdrawal.fee,
          withdrawal.status,
          method_lang.title,
          commission_usage.reference,
          commission_usage.note,
          withdrawal.date_add,
          withdrawal.processing_date
        FROM \`${config.prefix}ets_mp_withdrawal\` withdrawal
        INNER JOIN \`${config.prefix}ets_mp_commission_usage\` commission_usage
          ON commission_usage.id_withdraw = withdrawal.id_ets_mp_withdrawal
        LEFT JOIN \`${config.prefix}ets_mp_payment_method_lang\` method_lang
          ON method_lang.id_ets_mp_payment_method = withdrawal.id_ets_mp_payment_method
          AND method_lang.id_lang = ?
        WHERE commission_usage.id_customer = ?
          AND commission_usage.id_shop = ?
        ORDER BY withdrawal.id_ets_mp_withdrawal DESC
        LIMIT 10
      `,
      [context.defaultLanguageId, access.ownerCustomerId, context.defaultShopId]
    );

    return (rows as RecentPayoutRow[]).map((row) => {
      const amount = this.roundPrice(this.toNumber(row.amount));
      const fee = this.roundPrice(this.toNumber(row.fee));

      return {
        id: String(row.id_ets_mp_withdrawal),
        amount,
        netAmount: this.roundPrice(amount - fee),
        fee,
        status: this.mapPayoutStatus(row.status),
        paymentMethodName: row.title?.trim() || `Method ${row.id_ets_mp_withdrawal}`,
        requestedAt: this.normalizeDateTime(row.date_add) ?? this.toMysqlDateTime(new Date()),
        processingDate: this.normalizeDateTime(row.processing_date) ?? this.toMysqlDateTime(new Date()),
        reference: this.optionalText(row.reference),
        note: this.optionalText(row.note)
      };
    });
  }

  private normalizePayoutFields(method: SellerPayoutMethod, fields: Record<string, string>) {
    const normalized = new Map<number, string>();

    for (const field of method.fields) {
      const rawValue = fields[field.id];
      const value = this.optionalText(rawValue);

      if (field.required && !value) {
        throw new SellerActionServiceError(
          `Payout field "${field.title}" is required.`,
          "invalid_payload",
          400
        );
      }

      if (value && /[<>]/.test(value)) {
        throw new SellerActionServiceError(
          `Payout field "${field.title}" is not valid.`,
          "invalid_payload",
          400
        );
      }

      if (value) {
        normalized.set(Number.parseInt(field.id, 10), value);
      }
    }

    return normalized;
  }

  private async createPayoutRequest(
    access: MarketplaceSellerAccess,
    method: SellerPayoutMethod,
    amount: number,
    fee: number,
    fields: Map<number, string>
  ) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const context = await getPrestashopContext();
    const connection = await pool.getConnection();
    const now = this.toMysqlDateTime(new Date());
    const processingDate = this.toMysqlDateTime(
      new Date(Date.now() + method.estimatedProcessingDays * 24 * 60 * 60 * 1000)
    );

    let withdrawalId = 0;

    try {
      await connection.beginTransaction();

      const [insertWithdrawal] = await connection.execute<mysql.ResultSetHeader>(
        `
          INSERT INTO \`${config.prefix}ets_mp_withdrawal\` (
            id_ets_mp_payment_method,
            status,
            fee,
            fee_type,
            date_add,
            processing_date
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [Number.parseInt(method.id, 10), 0, fee, this.persistedFeeType(method.feeType), now, processingDate]
      );
      withdrawalId = insertWithdrawal.insertId;

      const reference = this.generateCommissionUsageReference();
      await connection.execute(
        `
          INSERT INTO \`${config.prefix}ets_mp_commission_usage\` (
            amount,
            reference,
            id_customer,
            id_shop,
            id_voucher,
            id_order,
            id_withdraw,
            id_currency,
            status,
            note,
            date_add,
            deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          amount,
          reference,
          access.ownerCustomerId,
          context.defaultShopId,
          0,
          0,
          withdrawalId,
          context.defaultCurrencyId,
          1,
          `Withdrawn (${method.title}, ID withdrawal: ${withdrawalId})`,
          now,
          0
        ]
      );

      for (const [fieldId, value] of fields.entries()) {
        await connection.execute(
          `
            INSERT INTO \`${config.prefix}ets_mp_withdrawal_field\` (
              id_ets_mp_withdrawal,
              id_ets_mp_payment_method_field,
              value
            ) VALUES (?, ?, ?)
          `,
          [withdrawalId, fieldId, value]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const recentRequests = await this.loadRecentPayoutRequests(access);
    const created = recentRequests.find((item) => item.id === String(withdrawalId));

    if (!created) {
      throw new SellerActionServiceError("Payout request could not be reloaded.", "unexpected", 500);
    }

    return created;
  }

  private parseThreadId(value: string) {
    const match = value.match(/^(order|contact)-(\d+)$/);

    if (!match) {
      throw new SellerActionServiceError("Seller thread identifier is invalid.", "invalid_payload", 400);
    }

    return {
      type: match[1] as "order" | "contact",
      numericId: Number.parseInt(match[2], 10)
    };
  }

  private mapVerificationStatus(status: number | null, expiresAt: string | Date | null): SellerVerificationStatus {
    if (status === verificationStatusMap.approved && expiresAt) {
      const expiryTime = new Date(this.normalizeDateTime(expiresAt) ?? "").getTime();
      if (Number.isFinite(expiryTime) && expiryTime <= Date.now()) {
        return "expired";
      }
    }

    switch (status) {
      case verificationStatusMap.pending:
        return "pending";
      case verificationStatusMap.approved:
        return "approved";
      case verificationStatusMap.rejected:
        return "rejected";
      case verificationStatusMap.expired:
        return "expired";
      default:
        return "not_submitted";
    }
  }

  private mapFeeType(value: string | null | undefined): SellerPayoutMethod["feeType"] {
    if (!value) {
      return "none";
    }

    if (value.toUpperCase() === "FIXED") {
      return "fixed";
    }

    if (value.toUpperCase() === "PERCENT") {
      return "percent";
    }

    return "none";
  }

  private persistedFeeType(value: SellerPayoutMethod["feeType"]) {
    if (value === "fixed") {
      return "FIXED";
    }

    if (value === "percent") {
      return "PERCENT";
    }

    return "NO_FEE";
  }

  private mapPayoutStatus(value: number) {
    if (value === 1) {
      return "approved" as const;
    }

    if (value === -1) {
      return "declined" as const;
    }

    return "pending" as const;
  }

  private calculatePayoutFee(method: SellerPayoutMethod, amount: number) {
    if (method.feeType === "fixed") {
      return this.roundPrice(method.feeFixed);
    }

    if (method.feeType === "percent") {
      return this.roundPrice((amount * method.feePercent) / 100);
    }

    return 0;
  }

  private getActorName(access: MarketplaceSellerAccess) {
    return access.role === "manager" ? access.email : access.displayName;
  }

  private generateCommissionUsageReference() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let reference = "";

    for (let index = 0; index < 9; index += 1) {
      reference += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return reference;
  }

  private truncatePreview(value: string | null | undefined, maxLength = 120) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return undefined;
    }

    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
  }

  private optionalText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private optionalLongText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private optionalNumber(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseOptionalCoordinate(value: string | null | undefined) {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) {
      throw new SellerActionServiceError("Coordinate value is not valid.", "invalid_payload", 400);
    }

    return parsed;
  }

  private requireCleanText(value: string, label: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new SellerActionServiceError(`${label} is required.`, "invalid_payload", 400);
    }

    if (/[<>]/.test(normalized)) {
      throw new SellerActionServiceError(`${label} is not valid.`, "invalid_payload", 400);
    }

    return normalized;
  }

  private isValidPhone(value: string) {
    return /^[0-9+()\-\s.]{7,64}$/.test(value);
  }

  private isValidUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private normalizeDateTime(value: string | Date | null | undefined) {
    if (!value) {
      return undefined;
    }

    const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString();
  }

  private toMysqlDateTime(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  private toNumber(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toInteger(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundPrice(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
