"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { useState, type PropsWithChildren } from "react";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/trpc";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export function TrpcProvider({ children }: Readonly<PropsWithChildren>) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: () => process.env.NODE_ENV === "development",
        }),
        httpBatchLink({
          url: `/api/trpc`,
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
