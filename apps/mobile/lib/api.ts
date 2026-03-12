import type {
  AddressInput,
  AuthSession,
  BusinessActionResponse,
  BusinessApplicationInput,
  BusinessOverview,
  CatalogHomeResponse,
  CheckoutSession,
  CurrentCartRfqResponse,
  CartAddressSelection,
  CartResponse,
  CountriesResponse,
  GuestBusinessApplicationInput,
  GuestBusinessApplicationResponse,
  StatesResponse,
  LoginPayload,
  LogoutPayload,
  MeResponse,
  OrderDetail,
  OrdersResponse,
  PaginatedProducts,
  ProductDetail,
  ProductListQuery,
  RefreshPayload,
  RfqDetail,
  RfqListResponse,
  SellerAffiliatesResponse,
  SellerCampaignsResponse,
  SellerContextResponse,
  SellerDashboardResponse,
  SellerFilterQuery,
  SellerListingsResponse,
  SellerProductsResponse,
  SellerTrendsResponse,
  SubmitRfqResponse,
  RegisterPayload
} from "@boxandbuy/contracts";

import { env } from "./env";
import { useAuthStore } from "../store/auth.store";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;

  return fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers
    }
  });
}

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${env.apiBaseUrl}/api/mobile/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken } satisfies RefreshPayload)
  });

  if (!response.ok) {
    await useAuthStore.getState().clearSession();
    return false;
  }

  const session = (await response.json()) as AuthSession;
  await useAuthStore.getState().setSession(session);
  return true;
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  let response = await requestOnce<T>(path, options);

  if (response.status === 401 && retry && (await tryRefreshSession())) {
    response = await requestOnce<T>(path, options);
  }

  if (!response.ok) {
    const fallback = { error: `Request failed: ${response.status}` };
    const payload = await response.json().catch(() => fallback);
    throw new Error(payload.error ?? fallback.error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const api = {
  addCartItem(productId: string, quantity = 1) {
    return request<CartResponse>("/api/mobile/cart/items", {
      method: "POST",
      body: JSON.stringify({ productId, quantity })
    });
  },
  getCart() {
    return request<CartResponse>("/api/mobile/cart");
  },
  async getRfqs() {
    const response = await request<RfqListResponse>("/api/mobile/rfqs");
    return response.items;
  },
  async getCurrentCartRfq() {
    const response = await request<CurrentCartRfqResponse>("/api/mobile/rfqs/current-cart");
    return response.rfq;
  },
  getRfqDetail(rfqId: string) {
    return request<RfqDetail>(`/api/mobile/rfqs/${rfqId}`);
  },
  submitRfq(customerNote?: string) {
    return request<SubmitRfqResponse>("/api/mobile/rfqs", {
      method: "POST",
      body: JSON.stringify({ customerNote })
    });
  },
  getBusinessOverview() {
    return request<BusinessOverview>("/api/mobile/business/overview");
  },
  getSellerContext() {
    return request<SellerContextResponse>("/api/mobile/seller/context");
  },
  getSellerDashboard(filters: SellerFilterQuery = {}) {
    return request<SellerDashboardResponse>(
      `/api/mobile/seller/dashboard${buildQuery({
        from: filters.from,
        to: filters.to,
        storeId: filters.storeId
      })}`
    );
  },
  async getSellerProducts(filters: SellerFilterQuery = {}) {
    const response = await request<SellerProductsResponse>(
      `/api/mobile/seller/products${buildQuery({
        from: filters.from,
        to: filters.to,
        storeId: filters.storeId
      })}`
    );
    return response.items;
  },
  async getSellerCampaigns(filters: SellerFilterQuery = {}) {
    const response = await request<SellerCampaignsResponse>(
      `/api/mobile/seller/campaigns${buildQuery({
        from: filters.from,
        to: filters.to,
        storeId: filters.storeId
      })}`
    );
    return response.items;
  },
  async getSellerListings(filters: SellerFilterQuery = {}) {
    const response = await request<SellerListingsResponse>(
      `/api/mobile/seller/listings${buildQuery({
        from: filters.from,
        to: filters.to,
        storeId: filters.storeId
      })}`
    );
    return response.items;
  },
  async getSellerAffiliates(filters: SellerFilterQuery = {}) {
    const response = await request<SellerAffiliatesResponse>(
      `/api/mobile/seller/affiliates${buildQuery({
        from: filters.from,
        to: filters.to,
        storeId: filters.storeId
      })}`
    );
    return response.items;
  },
  async getSellerTrends(filters: SellerFilterQuery = {}) {
    const response = await request<SellerTrendsResponse>(
      `/api/mobile/seller/trends${buildQuery({
        from: filters.from,
        to: filters.to,
        storeId: filters.storeId
      })}`
    );
    return response.items;
  },
  submitBusinessApplication(payload: BusinessApplicationInput) {
    return request<BusinessActionResponse>("/api/mobile/business/application", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  submitTermsApplication(payload: { requestedTermsDays: 15 | 30; customerNote?: string }) {
    return request<BusinessActionResponse>("/api/mobile/business/terms", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  submitGuestBusinessApplication(payload: GuestBusinessApplicationInput) {
    return request<GuestBusinessApplicationResponse>("/api/mobile/business/guest-application", {
      method: "POST",
      body: JSON.stringify(payload)
    }, false);
  },
  getCheckoutSession() {
    return request<CheckoutSession>("/api/mobile/checkout/session");
  },
  updateCartItem(productId: string, quantity: number) {
    return request<CartResponse>(`/api/mobile/cart/items/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity })
    });
  },
  removeCartItem(productId: string) {
    return request<CartResponse>(`/api/mobile/cart/items/${productId}`, {
      method: "DELETE"
    });
  },
  selectCartAddresses(payload: CartAddressSelection) {
    return request<CartResponse>("/api/mobile/cart/addresses/selection", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  createAddress(payload: AddressInput) {
    return request<CartResponse>("/api/mobile/cart/addresses", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateAddress(addressId: string, payload: AddressInput) {
    return request<CartResponse>(`/api/mobile/cart/addresses/${addressId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deleteAddress(addressId: string) {
    return request<CartResponse>(`/api/mobile/cart/addresses/${addressId}`, {
      method: "DELETE"
    });
  },
  async getCountries() {
    const response = await request<CountriesResponse>("/api/mobile/locations/countries", {}, false);
    return response.countries;
  },
  async getStates(countryId: string) {
    const response = await request<StatesResponse>(`/api/mobile/locations/countries/${countryId}/states`, {}, false);
    return response.states;
  },
  async getOrders() {
    const response = await request<OrdersResponse>("/api/mobile/orders");
    return response.orders;
  },
  getOrderDetail(orderId: string) {
    return request<OrderDetail>(`/api/mobile/orders/${orderId}`);
  },
  getCatalogHome() {
    return request<CatalogHomeResponse>("/api/mobile/catalog/home", {}, false);
  },
  listProducts(query: ProductListQuery) {
    return request<PaginatedProducts>(
      `/api/mobile/catalog/products${buildQuery({
        search: query.search,
        categoryId: query.categoryId,
        page: String(query.page),
        pageSize: String(query.pageSize)
      })}`,
      {},
      false
    );
  },
  getProductDetail(productId: string) {
    return request<ProductDetail>(`/api/mobile/catalog/products/${productId}`, {}, false);
  },
  getSession() {
    return request<MeResponse>("/api/mobile/auth/me");
  },
  async login(payload: LoginPayload) {
    const session = await request<AuthSession>("/api/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await useAuthStore.getState().setSession(session);
    return session;
  },
  async register(payload: RegisterPayload) {
    const session = await request<AuthSession>("/api/mobile/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await useAuthStore.getState().setSession(session);
    return session;
  },
  async logout() {
    const refreshToken = useAuthStore.getState().refreshToken;
    const payload: LogoutPayload = refreshToken ? { refreshToken } : {};

    try {
      await request<void>("/api/mobile/auth/logout", {
        method: "POST",
        body: JSON.stringify(payload)
      }, false);
    } finally {
      await useAuthStore.getState().clearSession();
    }
  }
};
