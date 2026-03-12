import type { BusinessApplicationInput, GuestBusinessApplicationInput } from "@boxandbuy/contracts";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

function useBusinessEnabled() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return hydrated && Boolean(accessToken);
}

export function useBusinessOverview() {
  const enabled = useBusinessEnabled();

  return useQuery({
    queryKey: ["business", "overview"],
    queryFn: () => api.getBusinessOverview(),
    enabled
  });
}

export function useSubmitBusinessApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BusinessApplicationInput) => api.submitBusinessApplication(payload),
    onSuccess: (response) => {
      if (response.overview) {
        queryClient.setQueryData(["business", "overview"], response.overview);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["business", "overview"] });
      }
    }
  });
}

export function useSubmitTermsApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { requestedTermsDays: 15 | 30; customerNote?: string }) =>
      api.submitTermsApplication(payload),
    onSuccess: (response) => {
      if (response.overview) {
        queryClient.setQueryData(["business", "overview"], response.overview);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["business", "overview"] });
      }
    }
  });
}

export function useSubmitGuestBusinessApplication() {
  return useMutation({
    mutationFn: (payload: GuestBusinessApplicationInput) => api.submitGuestBusinessApplication(payload)
  });
}
