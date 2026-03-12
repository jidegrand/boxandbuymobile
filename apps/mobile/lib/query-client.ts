import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Unauthenticated") || message.includes("404")) {
          return false;
        }

        return failureCount < 2;
      },
      staleTime: 30_000
    },
    mutations: {
      retry: false
    }
  }
});
