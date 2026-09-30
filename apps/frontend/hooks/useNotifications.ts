"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { NotificationsClientApi } from "@/lib/api/resources/notifications.api";
import type { NotificationList } from "@/types/Notification";

import { queryKeys } from "./shared/queryKeys";

const REFRESH_INTERVAL_MS = 60_000;

export const useNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: NotificationsClientApi.list,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: NotificationsClientApi.markAllRead,

    onSuccess: () =>
      queryClient.setQueryData<NotificationList>(
        queryKeys.notifications.all,
        (list) => list && { ...list, unreadCount: 0 },
      ),
  });
};
