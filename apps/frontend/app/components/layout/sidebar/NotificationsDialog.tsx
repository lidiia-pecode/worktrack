"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, UserCheck } from "lucide-react";

import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { NotificationType } from "@/types/enums";
import type { AppNotification } from "@/types/Notification";

import { EmptyState } from "../../shared/EmptyState";
import { ErrorState } from "../../shared/ErrorState";
import { LoadingState } from "../../shared/LoadingState";
import { ResourceFormModal } from "../../shared/resource/ResourceFormModal";

const SENT_AT_LABEL = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const PROJECTS_PATH = "/admin/projects";

interface NotificationRowProps {
  notification: AppNotification;
  onNavigate: () => void;
}

const NotificationRow = ({
  notification,
  onNavigate,
}: NotificationRowProps) => {
  const { subjectUser, readAt, createdAt } = notification;
  const name = subjectUser
    ? `${subjectUser.firstName} ${subjectUser.lastName}`
    : "Someone you invited";

  return (
    <li className="flex gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
        <UserCheck className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <span className="font-medium">{name}</span> accepted your invitation
          and joined.
          {!readAt && <span className="sr-only"> (new)</span>}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {SENT_AT_LABEL.format(new Date(createdAt))}
        </p>

        <Link
          href={PROJECTS_PATH}
          onClick={onNavigate}
          className="mt-1.5 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Put them on a project
        </Link>
      </div>

      {!readAt && (
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
          aria-hidden="true"
        />
      )}
    </li>
  );
};

interface NotificationsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationsDialog = ({
  open,
  onClose,
}: NotificationsDialogProps) => {
  const { data, isError, isPending, refetch } = useNotifications({
    enabled: true,
  });
  const markRead = useMarkNotificationsRead();
  const { mutate: markAllRead } = markRead;
  const hasUnread = (data?.unreadCount ?? 0) > 0;

  useEffect(() => {
    if (open && hasUnread) markAllRead();
  }, [open, hasUnread, markAllRead]);

  const notifications =
    data?.items.filter(
      (item) => item.type === NotificationType.INVITATION_ACCEPTED,
    ) ?? [];

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Notifications"
      icon={<Bell className="size-5" />}
    >
      {isError && !data ? (
        <ErrorState
          size="compact"
          title="Could not load your notifications."
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <LoadingState size="compact" title="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          size="compact"
          title="Nothing yet. When someone you invited joins, you will see it here."
        />
      ) : (
        <ul className="-my-3 divide-y divide-border">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onNavigate={onClose}
            />
          ))}
        </ul>
      )}
    </ResourceFormModal>
  );
};
