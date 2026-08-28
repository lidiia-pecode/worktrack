"use client";

import { Bell, LogOut, MoreHorizontal, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ROLE_LABELS } from "@/lib/constants";
import { useAuth } from "@/hooks/auth/useAuth";
import { initials } from "@/lib/utils/user";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@/hooks/useAuthActions";

export function UserMenu({ isDesktop = false }: { isDesktop?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const actions = useAuthActions();

  const userInitials = initials(user);

  const handleLogout = () => {
    actions.logout.mutate(undefined, {
      onSuccess: () => {
        router.push("/");
        router.refresh();
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100">
            <div
              className={`flex ${isDesktop ? "h-7 w-7" : "h-10 w-10"} items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white`}
            >
              {userInitials}
            </div>

            <div className="flex-1 text-left">
              {!isDesktop && (
                <p className="text-sm font-medium text-gray-900">
                  {user?.username}
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

        <DropdownMenuItem>
          <Bell />
          Notifications
        </DropdownMenuItem>

        <DropdownMenuSeparator className="m-0" />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleLogout}
          disabled={actions.logout.isPending}
        >
          <LogOut />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
