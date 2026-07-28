"use client";

import { useState } from "react";

import { User } from "@/types";
import { EntityCard } from "../shared/EntityCard";

import { initials } from "../helpers";
import { UserEditDialog } from "./UserEditDialog";

type Props = { user: User; isAdmin: boolean };

export const UserCard = ({ user, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EntityCard onClick={() => setOpen(true)}>
        <EntityCard.Header>
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 shrink-0 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
              {initials(user)}
            </div>

            <div className="min-w-0">
              <EntityCard.Title>
                {user.firstName} {user.lastName}
              </EntityCard.Title>

              <EntityCard.Description className="truncate">
                {user.email}
              </EntityCard.Description>

              {user.position && (
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {user.position}
                </p>
              )}
            </div>
          </div>
        </EntityCard.Header>

        <EntityCard.Footer>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200 px-3 py-1 text-xs font-medium">
            {user.role}
          </span>
          <EntityCard.Meta>@{user.username}</EntityCard.Meta>
        </EntityCard.Footer>
      </EntityCard>

      {open && (
        <UserEditDialog
          user={user}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
