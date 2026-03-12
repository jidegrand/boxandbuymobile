import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

function useRfqsEnabled() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return hydrated && Boolean(accessToken);
}

export function useRfqs() {
  const enabled = useRfqsEnabled();

  return useQuery({
    queryKey: ["rfqs"],
    queryFn: () => api.getRfqs(),
    enabled
  });
}

export function useCurrentCartRfq() {
  const enabled = useRfqsEnabled();

  return useQuery({
    queryKey: ["rfqs", "current-cart"],
    queryFn: () => api.getCurrentCartRfq(),
    enabled
  });
}

export function useRfqDetail(rfqId?: string) {
  const enabled = useRfqsEnabled();

  return useQuery({
    queryKey: ["rfqs", rfqId ?? ""],
    queryFn: () => api.getRfqDetail(rfqId ?? ""),
    enabled: enabled && Boolean(rfqId)
  });
}

export function useSubmitRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerNote?: string) => api.submitRfq(customerNote),
    onSuccess: (response) => {
      queryClient.setQueryData(["rfqs", "current-cart"], response.rfq);
      void queryClient.invalidateQueries({ queryKey: ["rfqs"] });
      void queryClient.invalidateQueries({ queryKey: ["rfqs", response.rfq.id] });
    }
  });
}
