"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { NotificationsClientApi } from "@/lib/api/resources/notifications.api";
import type { NotificationList } from "@/types/Notification";

import { queryKeys } from "./shared/queryKeys";

/**
 * Often enough to see someone join without a reload. React Query also refetches
 * when the tab regains focus.
 */
const REFRESH_INTERVAL_MS = 60_000;

/** Only people who can invite receive notifications, so only they ask. */
export const useNotifications = ({ enabled }: { enabled: boolean }) =>
  useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: NotificationsClientApi.list,
    refetchInterval: REFRESH_INTERVAL_MS,
    enabled,
  });

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationsClientApi.markAllRead,

    // A refresh already on its way would bring the old unread count back.
    onMutate: () =>
      queryClient.cancelQueries({ queryKey: queryKeys.notifications.all }),

    onSuccess: () =>
      queryClient.setQueryData<NotificationList>(
        queryKeys.notifications.all,
        (list) => list && { ...list, unreadCount: 0 },
      ),
  });
};
