"use client";

import { Bell, LogOut, MoreHorizontal, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminUserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
              LC
            </div>

            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-900">Lida</p>

              <p className="text-xs text-gray-500">Project Manager</p>
            </div>

            <MoreHorizontal size={18} className="text-gray-400" />
          </button>
        }
      />

      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuItem>
          <User />
          Profile Settings
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Bell />
          Notifications
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive">
          <LogOut />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
