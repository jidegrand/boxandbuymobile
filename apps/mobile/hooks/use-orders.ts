import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

function useOrdersEnabled() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return hydrated && Boolean(accessToken);
}

export function useOrders() {
  const enabled = useOrdersEnabled();

  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
    enabled
  });
}

export function useOrderDetail(orderId?: string) {
  const enabled = useOrdersEnabled();

  return useQuery({
    queryKey: ["orders", orderId ?? ""],
    queryFn: () => api.getOrderDetail(orderId ?? ""),
    enabled: enabled && Boolean(orderId)
  });
}

export function useCheckoutSession() {
  const enabled = useOrdersEnabled();

  return useQuery({
    queryKey: ["checkout", "session"],
    queryFn: () => api.getCheckoutSession(),
    enabled
  });
}
