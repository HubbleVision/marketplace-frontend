import type { PropsWithChildren } from "react";
import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { client } from "@openapi/client.gen";
import { SessionProvider, TOKEN_KEY, updateGlobalSession } from "./session";
import { OverlayProvider } from "./overlay-state";

// Dynamically import Web3Provider (depends on browser APIs, must execute on client)
const ClientProviders = lazy(() => import("./client-providers").then(module => ({ default: module.ClientProviders })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

client.setConfig({
    baseUrl:
    process.env.NODE_ENV === "development"
      ? "/api" // Development environment uses /api prefix, will be proxied by vite proxy
      : import.meta.env.VITE_ENV === "stage"
        ? import.meta.env.VITE_DEV_API_URL
        : import.meta.env.VITE_API_URL,
});

client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    let token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      if (token.startsWith(`"`) && token.endsWith(`"`)) {
        token = token.slice(1, -1);
      }
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

client.interceptors.response.use((config) => {
  if (config.status === 401 && typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    // Update global session state
    updateGlobalSession(false);
  }
  return config;
});

export default function Provider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <OverlayProvider>
          <Suspense fallback={<>{children}</>}>
            <ClientProviders>{children}</ClientProviders>
          </Suspense>
        </OverlayProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
