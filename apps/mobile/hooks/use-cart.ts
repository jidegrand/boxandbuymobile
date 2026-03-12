import type { AddressInput, CartAddressSelection } from "@boxandbuy/contracts";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

function useCartEnabled() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return hydrated && Boolean(accessToken);
}

export function useCart() {
  const enabled = useCartEnabled();

  return useQuery({
    queryKey: ["cart"],
    queryFn: () => api.getCart(),
    enabled
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["locations", "countries"],
    queryFn: () => api.getCountries(),
    staleTime: 5 * 60_000
  });
}

export function useStates(countryId?: string) {
  return useQuery({
    queryKey: ["locations", "states", countryId ?? ""],
    queryFn: () => api.getStates(countryId ?? ""),
    enabled: Boolean(countryId),
    staleTime: 5 * 60_000
  });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) =>
      api.addCartItem(productId, quantity),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.updateCartItem(productId, quantity),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => api.removeCartItem(productId),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}

export function useSelectCartAddresses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CartAddressSelection) => api.selectCartAddresses(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddressInput) => api.createAddress(payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, payload }: { addressId: string; payload: AddressInput }) =>
      api.updateAddress(addressId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => api.deleteAddress(addressId),
    onSuccess: (response) => {
      queryClient.setQueryData(["cart"], response);
    }
  });
}
