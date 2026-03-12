import type { SellerFilterQuery } from "@boxandbuy/contracts";

import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

type SellerQueryOptions = {
  enabled?: boolean;
};

function useSellerEnabled() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return hydrated && Boolean(accessToken);
}

export function useSellerContext(options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "context"],
    queryFn: () => api.getSellerContext(),
    enabled: options?.enabled ?? enabled
  });
}

export function useSellerDashboard(filters: SellerFilterQuery = {}, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "dashboard", filters.from ?? "", filters.to ?? "", filters.storeId ?? ""],
    queryFn: () => api.getSellerDashboard(filters),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSellerProducts(filters: SellerFilterQuery = {}, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "products", filters.from ?? "", filters.to ?? "", filters.storeId ?? ""],
    queryFn: () => api.getSellerProducts(filters),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSellerCampaigns(filters: SellerFilterQuery = {}, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "campaigns", filters.from ?? "", filters.to ?? "", filters.storeId ?? ""],
    queryFn: () => api.getSellerCampaigns(filters),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSellerListings(filters: SellerFilterQuery = {}, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "listings", filters.from ?? "", filters.to ?? "", filters.storeId ?? ""],
    queryFn: () => api.getSellerListings(filters),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSellerAffiliates(filters: SellerFilterQuery = {}, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "affiliates", filters.from ?? "", filters.to ?? "", filters.storeId ?? ""],
    queryFn: () => api.getSellerAffiliates(filters),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSellerTrends(filters: SellerFilterQuery = {}, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller", "trends", filters.from ?? "", filters.to ?? "", filters.storeId ?? ""],
    queryFn: () => api.getSellerTrends(filters),
    enabled: (options?.enabled ?? true) && enabled
  });
}
