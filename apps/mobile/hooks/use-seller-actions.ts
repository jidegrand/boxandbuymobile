import type {
  SellerMessageReplyInput,
  SellerPayoutRequestInput,
  SellerProfileUpdateInput
} from "@boxandbuy/contracts";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useSellerProfile(options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller-actions", "profile"],
    queryFn: () => api.getSellerProfile(),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useUpdateSellerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SellerProfileUpdateInput) => api.updateSellerProfile(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["seller-actions", "profile"], {
        profile: response.profile,
        permissions: response.permissions
      });
      void queryClient.invalidateQueries({ queryKey: ["seller-actions", "audit"] });
    }
  });
}

export function useSellerMessageThreads(options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller-actions", "messages"],
    queryFn: () => api.getSellerMessageThreads(),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSellerMessageThread(threadId: string | undefined, options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller-actions", "messages", threadId ?? ""],
    queryFn: () => api.getSellerMessageThread(threadId!),
    enabled: (options?.enabled ?? true) && enabled && Boolean(threadId)
  });
}

export function useReplyToSellerMessageThread(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SellerMessageReplyInput) => api.replyToSellerMessageThread(threadId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["seller-actions", "messages", threadId], {
        thread: response.thread,
        permissions: response.permissions
      });
      void queryClient.invalidateQueries({ queryKey: ["seller-actions", "messages"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-actions", "audit"] });
    }
  });
}

export function useSellerPayoutOverview(options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller-actions", "payouts"],
    queryFn: () => api.getSellerPayoutOverview(),
    enabled: (options?.enabled ?? true) && enabled
  });
}

export function useSubmitSellerPayoutRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SellerPayoutRequestInput) => api.submitSellerPayoutRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["seller-actions", "payouts"] });
      void queryClient.invalidateQueries({ queryKey: ["seller-actions", "audit"] });
    }
  });
}

export function useSellerAuditLog(options?: SellerQueryOptions) {
  const enabled = useSellerEnabled();

  return useQuery({
    queryKey: ["seller-actions", "audit"],
    queryFn: () => api.getSellerAuditLog(),
    enabled: (options?.enabled ?? true) && enabled
  });
}
