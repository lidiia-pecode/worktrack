import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { NotificationsClientApi } from "@/lib/api/resources/notifications.api";
import type { NotificationList } from "@/types/Notification";

import { queryKeys } from "./shared/queryKeys";
import { useMarkNotificationsRead } from "./useNotifications";

vi.mock("@/lib/api/resources/notifications.api", () => ({
  NotificationsClientApi: { markRead: vi.fn() },
}));

describe("useMarkNotificationsRead", () => {
  it("shows the unread count the server is left with", async () => {
    // Two of the three had already been read in another tab.
    vi.mocked(NotificationsClientApi.markRead).mockResolvedValue({
      unreadCount: 24,
    });
    const queryClient = new QueryClient();
    queryClient.setQueryData<NotificationList>(queryKeys.notifications.all, {
      items: [],
      unreadCount: 25,
    });

    const { result } = renderHook(() => useMarkNotificationsRead(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
    result.current.mutate(["a", "b", "c"]);

    await waitFor(() =>
      expect(
        queryClient.getQueryData<NotificationList>(queryKeys.notifications.all)
          ?.unreadCount,
      ).toBe(24),
    );
  });
});
