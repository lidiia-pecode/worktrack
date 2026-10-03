import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAuthActions } from "./useAuthActions";
import { queryKeys } from "../shared/queryKeys";

vi.mock("@/lib/api/resources", () => ({
  AuthClient: { logout: vi.fn().mockResolvedValue(undefined) },
}));

describe("useAuthActions logout", () => {
  it("leaves nothing of the previous person in the cache", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.auth.me(), { id: "user-1" });
    queryClient.setQueryData(["notifications"], { unreadCount: 3 });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    result.current.logout.mutate();

    await waitFor(() => expect(result.current.logout.isSuccess).toBe(true));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
