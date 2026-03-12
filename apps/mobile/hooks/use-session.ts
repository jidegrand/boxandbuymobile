import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

export function useSessionBootstrap() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
}

export function useSession() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await api.getSession();
      useAuthStore.getState().setUser(response.user);
      return response;
    },
    enabled: hydrated && Boolean(accessToken)
  });
}
