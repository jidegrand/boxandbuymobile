import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";

type ProductListOptions = {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

export function useCatalogHome() {
  return useQuery({
    queryKey: ["catalog", "home"],
    queryFn: () => api.getCatalogHome()
  });
}

export function useProductList(options: ProductListOptions) {
  return useQuery({
    queryKey: [
      "catalog",
      "products",
      options.search ?? "",
      options.categoryId ?? "",
      options.page ?? 1,
      options.pageSize ?? 20
    ],
    queryFn: () =>
      api.listProducts({
        search: options.search,
        categoryId: options.categoryId,
        page: options.page ?? 1,
        pageSize: options.pageSize ?? 20
      })
  });
}

export function useProductDetail(productId?: string) {
  return useQuery({
    queryKey: ["catalog", "product", productId],
    queryFn: () => api.getProductDetail(productId ?? ""),
    enabled: Boolean(productId)
  });
}
