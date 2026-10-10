"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getErrorMessage, isClientError } from "@/lib/api";

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (
                (error instanceof Error &&
                  error.message === "SESSION_EXPIRED") ||
                isClientError(error)
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
};

export default Providers;
