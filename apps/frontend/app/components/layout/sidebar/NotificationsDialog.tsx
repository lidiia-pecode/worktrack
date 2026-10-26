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
import { urlWithOpenEntity } from "@/lib/utils/entity-ref";

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

const USERS_PATH = "/admin/users";

// The person's panel, where their projects are; the list when they are unknown.
const personLink = (subjectUser: AppNotification["subjectUser"]) =>
  subjectUser
    ? urlWithOpenEntity(USERS_PATH, new URLSearchParams(), {
        type: "user",
        id: subjectUser.id,
      })
    : USERS_PATH;

interface NotificationRowProps {
  notification: AppNotification;
  onNavigate: () => void;
}

const NotificationRow = ({
  notification,
  onNavigate,
}: NotificationRowProps) => {
  const { type, subjectUser, readAt, createdAt } = notification;
  const isJoin = type === NotificationType.INVITATION_ACCEPTED;
  const name = subjectUser
    ? `${subjectUser.firstName} ${subjectUser.lastName}`
    : "Someone you invited";
  const Icon = isJoin ? UserCheck : Bell;

  return (
    <li className="flex gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {isJoin ? (
            <>
              <span className="font-medium">{name}</span> accepted your
              invitation and joined.
            </>
          ) : (
            "You have a new notification."
          )}
          {!readAt && <span className="sr-only"> (new)</span>}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {SENT_AT_LABEL.format(new Date(createdAt))}
        </p>

        {isJoin && (
          <Link
            href={personLink(subjectUser)}
            onClick={onNavigate}
            className="mt-1.5 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            Put them on a project
          </Link>
        )}
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
  const {
    mutate: markRead,
    isSuccess: markedSome,
    reset,
  } = useMarkNotificationsRead();

  const notifications = data?.items ?? [];
  // A string, so a refetch with the same unread ones doesn't mark them again.
  const shownUnreadIds = notifications
    .filter((notification) => !notification.readAt)
    .map((notification) => notification.id)
    .join();

  useEffect(() => {
    if (open && shownUnreadIds) markRead(shownUnreadIds.split(","));
  }, [open, shownUnreadIds, markRead]);

  // The next opening starts from the server: what is still unread comes first.
  const close = () => {
    onClose();
    if (markedSome) {
      reset();
      void refetch();
    }
  };

  return (
    <ResourceFormModal
      open={open}
      onClose={close}
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
              onNavigate={close}
            />
          ))}
        </ul>
      )}
    </ResourceFormModal>
  );
};
