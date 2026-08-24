"use client";

import { useState } from "react";
import { Mail, UserRound, UsersRound } from "lucide-react";

import { User } from "@/types";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils/user";

import { UpdateUserModal } from "./UpdateUserModal";

type Props = {
  user: User;
  canManage: boolean;
};

export const UserCard = ({ user }: Props) => {
  const [open, setOpen] = useState(false);

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          group w-full text-left
          rounded-2xl border border-border
          bg-card p-5
          shadow-sm
          transition
          hover:-translate-y-0.5
          hover:border-brand/40
          hover:shadow-md
          focus:outline-none
          focus:ring-2 focus:ring-ring/25
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* Avatar */}
            <div
              className="
                flex size-11 shrink-0 items-center justify-center
                rounded-xl
                bg-brand-subtle
                text-sm font-semibold
                text-primary
              "
            >
              {initials(user)}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-card-foreground">
                {fullName}
              </h3>

              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user.position || "No position"}
              </p>
            </div>
          </div>

          {/* Role */}
          <span
            className="
              shrink-0 rounded-full
              bg-accent px-2.5 py-1
              text-[11px] font-medium
              text-accent-foreground
            "
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>

          {user.username && (
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <UserRound className="size-3.5 shrink-0" />
              <span className="truncate">@{user.username}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UsersRound className="size-3.5 shrink-0" />
            {/* <span>
              {user.projects?.length ?? 0}{" "}
              {user.projects?.length === 1 ? "project" : "projects"}
            </span> */}
          </div>
        </div>
      </button>

      {open && <UpdateUserModal user={user} onClose={() => setOpen(false)} />}
    </>
  );
};
