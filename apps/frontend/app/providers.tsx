"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/api";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (
                error instanceof Error &&
                error.message === "SESSION_EXPIRED"
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            onError: (error) => {
              const message = getErrorMessage(error);

              toast.error(message);
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
