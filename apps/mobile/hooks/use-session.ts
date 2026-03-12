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
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["session"],
    queryFn: api.getSession,
    enabled: hydrated && Boolean(token)
  });
}

