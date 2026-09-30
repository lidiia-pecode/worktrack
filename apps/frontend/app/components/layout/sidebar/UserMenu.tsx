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
import { fullName, initials } from "@/lib/utils/user";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useNotifications } from "@/hooks/useNotifications";

import { NotificationsDialog } from "./NotificationsDialog";

/** Past this the badge reads "9+", which is all a count in a menu needs. */
const MAX_SHOWN_COUNT = 9;

const countLabel = (count: number) =>
  count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);

export function UserMenu({ isDesktop = false }: { isDesktop?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const actions = useAuthActions();
  const receivesNotifications =
    Boolean(user) && user?.role !== UserRole.EMPLOYEE;
  const { data: notifications } = useNotifications({
    enabled: receivesNotifications,
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userInitials = initials(user);
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
              className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100"
              aria-label={accountLabel}
            >
              <div
                className={`relative flex ${isDesktop ? "h-7 w-7" : "h-10 w-10"} items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white`}
              >
                {userInitials}

                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 size-2.5 rounded-full bg-brand ring-2 ring-background"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="flex-1 text-left">
                {!isDesktop && (
                  <p className="text-sm font-medium text-gray-900">
                    {user && fullName(user)}
                  </p>
                )}

                <p className="text-xs text-gray-500">
                  {user ? ROLE_LABELS[user.role] : ""}
                </p>
              </div>

              <MoreHorizontal size={18} className="text-gray-400" />
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
