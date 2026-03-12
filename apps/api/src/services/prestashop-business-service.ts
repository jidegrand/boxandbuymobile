import type {
  BusinessActionResponse,
  BusinessApplication,
  BusinessApplicationInput,
  BusinessOverview,
  GuestBusinessApplicationInput,
  GuestBusinessApplicationResponse,
  TermsApplication,
  TermsApplicationInput
} from "@boxandbuy/contracts";

import { hash } from "bcryptjs";
import mysql from "mysql2/promise";

import { getPrestashopConfig, getPrestashopPool } from "./prestashop-context";

type CustomerRow = {
  id_customer: number;
  firstname: string;
  lastname: string;
  email: string;
  active: number;
};

type ApplicationRow = {
  id_bbbusiness_application: number;
  id_customer: number | null;
  company_name: string;
  tax_id: string | null;
  phone: string | null;
  message: string | null;
  applicant_firstname: string | null;
  applicant_lastname: string | null;
  applicant_email: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
};

type TermsRow = {
  id_bbbusiness_terms_application: number;
  id_customer: number;
  requested_terms_days: number;
  approved_terms_days: number | null;
  status: "pending" | "approved" | "rejected" | "revoked";
  customer_note: string | null;
  admin_note: string | null;
  submitted_at: string;
  updated_at: string;
  decided_at: string | null;
};

type ConfigurationRow = {
  value: string | null;
};

export class BusinessServiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "inactive_account"
      | "business_required"
      | "email_exists"
      | "already_approved"
      | "customer_not_found"
      | "invalid_payload"
      | "unexpected"
  ) {
    super(message);
    this.name = "BusinessServiceError";
  }
}

export class PrestashopBusinessService {
  async getOverview(customerId: string): Promise<BusinessOverview> {
    const parsedCustomerId = this.parseId(customerId);
    const [customer, application, termsApplication, businessGroupId] = await Promise.all([
      this.findCustomer(parsedCustomerId),
      this.findApplicationByCustomer(parsedCustomerId),
      this.findTermsByCustomer(parsedCustomerId),
      this.getBusinessGroupId()
    ]);

    if (!customer) {
      throw new BusinessServiceError("Customer account was not found.", "customer_not_found");
    }

    const accountActive = this.toBoolean(customer.active);
    const isBusinessCustomer = businessGroupId > 0
      ? await this.isCustomerInBusinessGroup(parsedCustomerId, businessGroupId)
      : false;
    const canSubmitApplication = accountActive && application?.status !== "approved";
    const canApplyForTerms = accountActive
      && isBusinessCustomer
      && (!termsApplication || !["approved", "pending"].includes(termsApplication.status));
    const approvedTermsDays =
      termsApplication?.status === "approved" && termsApplication.approved_terms_days
        ? termsApplication.approved_terms_days
        : 0;

    return {
      accountActive,
      isBusinessCustomer,
      canSubmitApplication,
      canApplyForTerms,
      approvedTermsDays,
      application: application ? this.mapApplication(application, customer) : undefined,
      termsApplication: termsApplication ? this.mapTermsApplication(termsApplication) : undefined
    };
  }

  async submitApplication(customerId: string, payload: BusinessApplicationInput): Promise<BusinessActionResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const customer = await this.requireCustomer(parsedCustomerId);

    if (!this.toBoolean(customer.active)) {
      throw new BusinessServiceError("Your account is disabled. Contact support to continue.", "inactive_account");
    }

    const existing = await this.findApplicationByCustomer(parsedCustomerId);
    const now = this.formatDate(new Date());
    const config = await getPrestashopConfig();
    const pool = await getPrestashopPool();
    const applicationData = {
      company_name: payload.companyName.trim(),
      tax_id: this.nullableString(payload.taxId),
      phone: this.nullableString(payload.phone),
      message: this.nullableString(payload.message),
      applicant_firstname: this.nullableString(customer.firstname),
      applicant_lastname: this.nullableString(customer.lastname),
      applicant_email: customer.email.trim().toLowerCase(),
      updated_at: now
    };

    if (existing) {
      if (existing.status === "approved") {
        throw new BusinessServiceError("Your business account is already approved.", "already_approved");
      }

      await pool.execute(
        `
          UPDATE \`${config.prefix}bbbusiness_application\`
          SET
            company_name = ?,
            tax_id = ?,
            phone = ?,
            message = ?,
            applicant_firstname = ?,
            applicant_lastname = ?,
            applicant_email = ?,
            status = 'pending',
            admin_note = NULL,
            id_employee = NULL,
            decided_at = NULL,
            updated_at = ?
          WHERE id_bbbusiness_application = ?
        `,
        [
          applicationData.company_name,
          applicationData.tax_id,
          applicationData.phone,
          applicationData.message,
          applicationData.applicant_firstname,
          applicationData.applicant_lastname,
          applicationData.applicant_email,
          applicationData.updated_at,
          existing.id_bbbusiness_application
        ]
      );

      return {
        message: "Your business application has been updated and submitted for review.",
        overview: await this.getOverview(customerId)
      };
    }

    await pool.execute(
      `
        INSERT INTO \`${config.prefix}bbbusiness_application\` (
          id_customer,
          company_name,
          tax_id,
          phone,
          message,
          applicant_firstname,
          applicant_lastname,
          applicant_email,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        parsedCustomerId,
        applicationData.company_name,
        applicationData.tax_id,
        applicationData.phone,
        applicationData.message,
        applicationData.applicant_firstname,
        applicationData.applicant_lastname,
        applicationData.applicant_email,
        now,
        now
      ]
    );

    return {
      message: "Your business application has been submitted successfully.",
      overview: await this.getOverview(customerId)
    };
  }

  async submitTermsApplication(customerId: string, payload: TermsApplicationInput): Promise<BusinessActionResponse> {
    const parsedCustomerId = this.parseId(customerId);
    const customer = await this.requireCustomer(parsedCustomerId);

    if (!this.toBoolean(customer.active)) {
      throw new BusinessServiceError("Your account is disabled. Contact support to continue.", "inactive_account");
    }

    const businessGroupId = await this.getBusinessGroupId();
    if (businessGroupId <= 0 || !(await this.isCustomerInBusinessGroup(parsedCustomerId, businessGroupId))) {
      throw new BusinessServiceError(
        "Business account approval is required before applying for invoice terms.",
        "business_required"
      );
    }

    const existing = await this.findTermsByCustomer(parsedCustomerId);
    const now = this.formatDate(new Date());
    const config = await getPrestashopConfig();
    const pool = await getPrestashopPool();

    if (existing?.status === "approved") {
      throw new BusinessServiceError(
        `Your invoice terms are already approved (Net ${existing.approved_terms_days ?? payload.requestedTermsDays}).`,
        "already_approved"
      );
    }

    if (existing) {
      await pool.execute(
        `
          UPDATE \`${config.prefix}bbbusiness_terms_application\`
          SET
            requested_terms_days = ?,
            customer_note = ?,
            status = 'pending',
            approved_terms_days = NULL,
            admin_note = NULL,
            id_employee = NULL,
            decided_at = NULL,
            updated_at = ?
          WHERE id_bbbusiness_terms_application = ?
        `,
        [
          payload.requestedTermsDays,
          this.nullableString(payload.customerNote),
          now,
          existing.id_bbbusiness_terms_application
        ]
      );

      return {
        message: "Your terms application has been updated and submitted for review.",
        overview: await this.getOverview(customerId)
      };
    }

    await pool.execute(
      `
        INSERT INTO \`${config.prefix}bbbusiness_terms_application\` (
          id_customer,
          requested_terms_days,
          status,
          customer_note,
          submitted_at,
          updated_at
        ) VALUES (?, ?, 'pending', ?, ?, ?)
      `,
      [
        parsedCustomerId,
        payload.requestedTermsDays,
        this.nullableString(payload.customerNote),
        now,
        now
      ]
    );

    return {
      message: "Your terms application has been submitted successfully.",
      overview: await this.getOverview(customerId)
    };
  }

  async submitGuestApplication(payload: GuestBusinessApplicationInput): Promise<GuestBusinessApplicationResponse> {
    const email = payload.email.trim().toLowerCase();
    const existingCustomer = await this.findCustomerByEmail(email);

    if (existingCustomer) {
      throw new BusinessServiceError(
        "A customer account already exists for this email. Please sign in and apply from your account.",
        "email_exists"
      );
    }

    const existingApplication = await this.findApplicationByGuestEmail(email);
    if (existingApplication?.status === "approved") {
      throw new BusinessServiceError(
        "This business application has already been approved. Please sign in or reset your password to access the account.",
        "already_approved"
      );
    }

    const passwordHash = await hash(payload.password, 10);
    const now = this.formatDate(new Date());
    const config = await getPrestashopConfig();
    const pool = await getPrestashopPool();

    if (existingApplication) {
      await pool.execute(
        `
          UPDATE \`${config.prefix}bbbusiness_application\`
          SET
            id_customer = NULL,
            company_name = ?,
            tax_id = ?,
            phone = ?,
            message = ?,
            applicant_firstname = ?,
            applicant_lastname = ?,
            applicant_email = ?,
            applicant_password_hash = ?,
            status = 'pending',
            admin_note = NULL,
            id_employee = NULL,
            decided_at = NULL,
            updated_at = ?
          WHERE id_bbbusiness_application = ?
        `,
        [
          payload.companyName.trim(),
          this.nullableString(payload.taxId),
          this.nullableString(payload.phone),
          this.nullableString(payload.message),
          payload.firstName.trim(),
          payload.lastName.trim(),
          email,
          passwordHash,
          now,
          existingApplication.id_bbbusiness_application
        ]
      );

      return {
        message: "Your business application has been updated and submitted for review."
      };
    }

    await pool.execute(
      `
        INSERT INTO \`${config.prefix}bbbusiness_application\` (
          id_customer,
          company_name,
          tax_id,
          phone,
          message,
          applicant_firstname,
          applicant_lastname,
          applicant_email,
          applicant_password_hash,
          status,
          created_at,
          updated_at
        ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        payload.companyName.trim(),
        this.nullableString(payload.taxId),
        this.nullableString(payload.phone),
        this.nullableString(payload.message),
        payload.firstName.trim(),
        payload.lastName.trim(),
        email,
        passwordHash,
        now,
        now
      ]
    );

    return {
      message:
        "Your business application has been submitted. Check your email for confirmation and next steps after approval."
    };
  }

  private async requireCustomer(customerId: number) {
    const customer = await this.findCustomer(customerId);

    if (!customer) {
      throw new BusinessServiceError("Customer account was not found.", "customer_not_found");
    }

    return customer;
  }

  private async findCustomer(customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_customer, firstname, lastname, email, active
        FROM \`${config.prefix}customer\`
        WHERE id_customer = ?
          AND deleted = 0
        LIMIT 1
      `,
      [customerId]
    );

    return (rows[0] as CustomerRow | undefined) ?? null;
  }

  private async findCustomerByEmail(email: string) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT id_customer, firstname, lastname, email, active
        FROM \`${config.prefix}customer\`
        WHERE email = ?
          AND deleted = 0
          AND is_guest = 0
        ORDER BY id_customer DESC
        LIMIT 1
      `,
      [email]
    );

    return (rows[0] as CustomerRow | undefined) ?? null;
  }

  private async findApplicationByCustomer(customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT *
        FROM \`${config.prefix}bbbusiness_application\`
        WHERE id_customer = ?
        LIMIT 1
      `,
      [customerId]
    );

    return (rows[0] as ApplicationRow | undefined) ?? null;
  }

  private async findApplicationByGuestEmail(email: string) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT *
        FROM \`${config.prefix}bbbusiness_application\`
        WHERE applicant_email = ?
        ORDER BY id_bbbusiness_application DESC
        LIMIT 1
      `,
      [email]
    );

    return (rows[0] as ApplicationRow | undefined) ?? null;
  }

  private async findTermsByCustomer(customerId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT *
        FROM \`${config.prefix}bbbusiness_terms_application\`
        WHERE id_customer = ?
        LIMIT 1
      `,
      [customerId]
    );

    return (rows[0] as TermsRow | undefined) ?? null;
  }

  private async getBusinessGroupId() {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [configRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT value
        FROM \`${config.prefix}configuration\`
        WHERE name = 'BBBUSINESS_GROUP_ID'
        LIMIT 1
      `
    );
    const configuredId = this.toInteger((configRows[0] as ConfigurationRow | undefined)?.value);

    if (configuredId > 0) {
      return configuredId;
    }

    const [groupRows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT g.id_group
        FROM \`${config.prefix}group\` g
        INNER JOIN \`${config.prefix}group_lang\` gl
          ON gl.id_group = g.id_group
        WHERE TRIM(gl.name) = 'Business'
        ORDER BY g.id_group ASC
        LIMIT 1
      `
    );

    return this.toInteger((groupRows[0] as { id_group?: number } | undefined)?.id_group);
  }

  private async isCustomerInBusinessGroup(customerId: number, groupId: number) {
    const pool = await getPrestashopPool();
    const config = await getPrestashopConfig();
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `
        SELECT COUNT(*) AS total
        FROM \`${config.prefix}customer_group\`
        WHERE id_customer = ?
          AND id_group = ?
      `,
      [customerId, groupId]
    );

    return this.toInteger((rows[0] as { total?: string | number } | undefined)?.total) > 0;
  }

  private mapApplication(row: ApplicationRow, customer: CustomerRow): BusinessApplication {
    return {
      id: String(row.id_bbbusiness_application),
      status: row.status,
      companyName: row.company_name,
      taxId: this.normalizeText(row.tax_id),
      phone: this.normalizeText(row.phone),
      message: this.normalizeText(row.message),
      applicantFirstName: this.normalizeText(row.applicant_firstname) ?? this.normalizeText(customer.firstname),
      applicantLastName: this.normalizeText(row.applicant_lastname) ?? this.normalizeText(customer.lastname),
      applicantEmail: this.normalizeText(row.applicant_email) ?? customer.email.trim().toLowerCase(),
      adminNote: this.normalizeText(row.admin_note),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      decidedAt: this.normalizeText(row.decided_at)
    };
  }

  private mapTermsApplication(row: TermsRow): TermsApplication {
    return {
      id: String(row.id_bbbusiness_terms_application),
      status: row.status,
      requestedTermsDays: row.requested_terms_days,
      approvedTermsDays: row.approved_terms_days ?? undefined,
      customerNote: this.normalizeText(row.customer_note),
      adminNote: this.normalizeText(row.admin_note),
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      decidedAt: this.normalizeText(row.decided_at)
    };
  }

  private nullableString(value: string | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeText(value: unknown) {
    if (value === null || value === undefined) {
      return undefined;
    }

    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  private parseId(value: string) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
      throw new BusinessServiceError("Invalid identifier.", "invalid_payload");
    }

    return parsed;
  }

  private toBoolean(value: string | number | boolean | null | undefined) {
    return value === true || value === 1 || value === "1";
  }

  private toInteger(value: string | number | null | undefined) {
    const parsed = Number.parseInt(String(value ?? 0), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }
}
