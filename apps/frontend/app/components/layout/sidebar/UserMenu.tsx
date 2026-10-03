"use client";

import { useState } from "react";
import { Bell, LogOut, MoreHorizontal, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ROLE_LABELS } from "@/lib/constants";
import { UserRole } from "@/types/enums";
import { useAuth } from "@/hooks/auth/useAuth";
import { fullName } from "@/lib/utils/user";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useNotifications } from "@/hooks/useNotifications";

import { Avatar } from "../../shared/Avatar";
import { NotificationsDialog } from "./NotificationsDialog";

/** Past this the badge reads "9+", which is all a count in a menu needs. */
const MAX_SHOWN_COUNT = 9;

const countLabel = (count: number) =>
  count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);

export function UserMenu() {
  const router = useRouter();
  const { user } = useAuth();
  const actions = useAuthActions();
  const receivesNotifications =
    Boolean(user) && user?.role !== UserRole.EMPLOYEE;
  const { data: notifications } = useNotifications({
    enabled: receivesNotifications,
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unreadCount = notifications?.unreadCount ?? 0;
  const accountLabel = [
    user && `${fullName(user)}, ${ROLE_LABELS[user.role]}`,
    "account menu",
    unreadCount > 0 && `${unreadCount} unread notifications`,
  ]
    .filter(Boolean)
    .join(", ");

  const handleLogout = () => {
    actions.logout.mutate(undefined, {
      onSuccess: () => {
        router.push("/");
        router.refresh();
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
              aria-label={accountLabel}
            >
              <span className="relative shrink-0">
                {user && <Avatar user={user} size="md" className="ring-0" />}

                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-brand ring-2 ring-sidebar"
                    aria-hidden="true"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {user && fullName(user)}
                </span>

                <span className="block text-xs text-muted-foreground">
                  {user ? ROLE_LABELS[user.role] : ""}
                </span>
              </span>

              <MoreHorizontal
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          }
        />

        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-56 p-0"
        >
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <User />
            Settings
          </DropdownMenuItem>

          {receivesNotifications && (
            <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
              <Bell />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-foreground tabular-nums">
                  {countLabel(unreadCount)}
                </span>
              )}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="m-0" />

          <DropdownMenuItem
            variant="destructive"
            onClick={handleLogout}
            disabled={actions.logout.isPending}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {receivesNotifications && (
        <NotificationsDialog
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
    </>
  );
}
