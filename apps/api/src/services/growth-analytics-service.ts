import { randomBytes } from "node:crypto";

import type {
  SellerAffiliatesResponse,
  SellerCampaignsResponse,
  SellerContextResponse,
  SellerDashboardResponse,
  SellerFilterQuery,
  SellerListingsResponse,
  SellerProductsResponse,
  SellerStore,
  SellerTrendsResponse,
  SessionUser
} from "@boxandbuy/contracts";
import { SignJWT } from "jose";

import { getGrowthRuntimeConfig } from "./growth-context";
import {
  type SellerSessionClaims,
  PrestashopSellerService
} from "./prestashop-seller-service";

type GrowthSessionResponse = {
  user?: {
    sellerId?: string;
    userSub?: string;
    role?: string;
    displayName?: string;
    email?: string;
  };
  stores?: SellerStore[];
};

export class GrowthSellerServiceError extends Error {
  constructor(
    message: string,
    readonly code: "seller_unavailable" | "forbidden" | "invalid_filters" | "unexpected",
    readonly statusCode = code === "seller_unavailable" ? 403 : code === "invalid_filters" ? 400 : 500
  ) {
    super(message);
    this.name = "GrowthSellerServiceError";
  }
}

export class GrowthAnalyticsService {
  constructor(private readonly sellerService = new PrestashopSellerService()) {}

  async getContext(user: SessionUser): Promise<SellerContextResponse> {
    const session = await this.requireSellerSession(user);

    return this.withGrowthClient(session, async (client) => {
      const context = await client.getJson<GrowthSessionResponse>("/api/auth/session");
      return {
        seller: this.mapSellerIdentity(context, session)
      };
    });
  }

  async getDashboard(user: SessionUser, filtersInput: SellerFilterQuery): Promise<SellerDashboardResponse> {
    const session = await this.requireSellerSession(user);
    const filters = this.normalizeFilters(filtersInput);

    return this.withGrowthClient(session, async (client) => {
      const [context, overview, marketingPerformance, creativeIntelligence, listingHealth, recommendations, trends] =
        await Promise.all([
          client.getJson<GrowthSessionResponse>("/api/auth/session"),
          client.getJson<SellerDashboardResponse["overview"]>(
            this.buildGrowthPath("/api/v1/dashboard/overview", filters)
          ),
          client.getJson<SellerDashboardResponse["marketingPerformance"]>(
            this.buildGrowthPath("/api/v1/dashboard/marketing-performance", filters)
          ),
          client.getJson<SellerDashboardResponse["creativeIntelligence"]>(
            this.buildGrowthPath("/api/v1/dashboard/creative-intelligence", filters)
          ),
          client.getJson<SellerDashboardResponse["listingHealth"]>(
            this.buildGrowthPath("/api/v1/dashboard/listing-health", filters)
          ),
          client.getJson<{ recommendations?: SellerDashboardResponse["recommendations"] }>(
            this.buildGrowthPath("/api/v1/dashboard/recommendations", filters)
          ),
          client.getJson<{ items?: SellerDashboardResponse["trends"] }>(
            this.buildGrowthPath("/api/v1/trends", filters)
          )
        ]);

      return {
        seller: this.mapSellerIdentity(context, session),
        filters: {
          from: filters.from,
          to: filters.to,
          selectedStoreId: filters.storeId
        },
        overview,
        marketingPerformance,
        creativeIntelligence,
        listingHealth,
        recommendations: recommendations.recommendations ?? [],
        trends: trends.items ?? []
      };
    });
  }

  async listProducts(user: SessionUser, filtersInput: SellerFilterQuery): Promise<SellerProductsResponse> {
    const session = await this.requireSellerSession(user);
    const filters = this.normalizeFilters(filtersInput);

    return this.withGrowthClient(session, async (client) => {
      return client.getJson<SellerProductsResponse>(this.buildGrowthPath("/api/v1/products", filters));
    });
  }

  async listCampaigns(user: SessionUser, filtersInput: SellerFilterQuery): Promise<SellerCampaignsResponse> {
    const session = await this.requireSellerSession(user);
    const filters = this.normalizeFilters(filtersInput);

    return this.withGrowthClient(session, async (client) => {
      return client.getJson<SellerCampaignsResponse>(this.buildGrowthPath("/api/v1/campaigns", filters));
    });
  }

  async listListings(user: SessionUser, filtersInput: SellerFilterQuery): Promise<SellerListingsResponse> {
    const session = await this.requireSellerSession(user);
    const filters = this.normalizeFilters(filtersInput);

    return this.withGrowthClient(session, async (client) => {
      return client.getJson<SellerListingsResponse>(this.buildGrowthPath("/api/v1/listings", filters));
    });
  }

  async listAffiliates(user: SessionUser, filtersInput: SellerFilterQuery): Promise<SellerAffiliatesResponse> {
    const session = await this.requireSellerSession(user);
    const filters = this.normalizeFilters(filtersInput);

    return this.withGrowthClient(session, async (client) => {
      return client.getJson<SellerAffiliatesResponse>(this.buildGrowthPath("/api/v1/affiliates", filters));
    });
  }

  async listTrends(user: SessionUser, filtersInput: SellerFilterQuery): Promise<SellerTrendsResponse> {
    const session = await this.requireSellerSession(user);
    const filters = this.normalizeFilters(filtersInput);

    return this.withGrowthClient(session, async (client) => {
      return client.getJson<SellerTrendsResponse>(this.buildGrowthPath("/api/v1/trends", filters));
    });
  }

  private async requireSellerSession(user: SessionUser) {
    const session = await this.sellerService.resolveSessionForUser(user);

    if (!session) {
      throw new GrowthSellerServiceError(
        "Seller access is not available for this account.",
        "seller_unavailable"
      );
    }

    return session;
  }

  private async withGrowthClient<T>(
    session: SellerSessionClaims,
    callback: (client: GrowthProxyClient) => Promise<T>
  ) {
    const client = new GrowthProxyClient(session);
    await client.initialize();
    return callback(client);
  }

  private mapSellerIdentity(context: GrowthSessionResponse, session: SellerSessionClaims) {
    return {
      sellerId: context.user?.sellerId ?? session.sellerId,
      userSub: context.user?.userSub ?? session.userSub,
      role: (context.user?.role as SellerContextResponse["seller"]["role"] | undefined) ?? session.role,
      displayName: context.user?.displayName ?? session.displayName,
      email: context.user?.email ?? session.email,
      stores: Array.isArray(context.stores) ? context.stores : []
    };
  }

  private normalizeFilters(filtersInput: SellerFilterQuery) {
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 30);

    const from = filtersInput.from ?? fromDate.toISOString().slice(0, 10);
    const to = filtersInput.to ?? now.toISOString().slice(0, 10);

    if (from > to) {
      throw new GrowthSellerServiceError(
        "The seller analytics date range is invalid.",
        "invalid_filters",
        400
      );
    }

    return {
      from,
      to,
      storeId: filtersInput.storeId
    };
  }

  private buildGrowthPath(
    path: string,
    filters: {
      from: string;
      to: string;
      storeId?: string;
    }
  ) {
    const searchParams = new URLSearchParams({
      from: filters.from,
      to: filters.to
    });

    if (filters.storeId) {
      searchParams.set("storeId", filters.storeId);
    }

    return `${path}?${searchParams.toString()}`;
  }
}

class GrowthProxyClient {
  private cookieHeader = "";

  constructor(private readonly session: SellerSessionClaims) {}

  async initialize() {
    const config = await getGrowthRuntimeConfig();
    const token = await new SignJWT({
      seller_id: this.session.sellerId,
      role: this.session.role,
      store_ids: this.session.storeIds,
      seller_email: this.session.email,
      seller_display_name: this.session.displayName
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(config.mainDashboardOrigin)
      .setAudience(config.appOrigin)
      .setSubject(this.session.userSub)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 120)
      .setJti(`gc-${randomBytes(16).toString("hex")}`)
      .sign(new TextEncoder().encode(config.jwtSharedSecret));

    const response = await fetch(`${config.webBaseUrl}/auth/accept?token=${encodeURIComponent(token)}`, {
      redirect: "manual"
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    const match = setCookie.match(new RegExp(`${config.cookieName}=([^;]+)`));

    if (!match?.[1]) {
      throw new GrowthSellerServiceError(
        "Unable to establish a Growth Center session for this seller.",
        "unexpected",
        502
      );
    }

    this.cookieHeader = `${config.cookieName}=${match[1]}`;
  }

  async getJson<T>(path: string): Promise<T> {
    const config = await getGrowthRuntimeConfig();
    const response = await fetch(`${config.webBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        Cookie: this.cookieHeader
      }
    });

    if (!response.ok) {
      const fallback = { error: `Growth request failed: ${response.status}` };
      const payload = await response.json().catch(() => fallback);
      const message = payload.error ?? fallback.error;

      throw new GrowthSellerServiceError(
        message,
        response.status === 401 || response.status === 403 ? "forbidden" : "unexpected",
        response.status
      );
    }

    return response.json() as Promise<T>;
  }
}
