"use client";

import { useState } from "react";

import { User } from "@/types";
import { useUsers } from "@/hooks/useUsers";
import { EntityCard } from "../shared/EntityCard";
import { ConfirmModal } from "../shared/ConfirmModal";
import { initials } from "@/lib/utils/user";
import { UpdateUserModal } from "./UpdateUserModal";

type Props = { user: User; isAdmin: boolean };

export const UserCard = ({ user, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    actions: { archive },
  } = useUsers();

  const handleConfirmDelete = async () => {
    await archive.mutateAsync(user.id);
    setShowDeleteConfirm(false);
  };

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
          <EntityCard.Meta>{user.username}</EntityCard.Meta>
        </EntityCard.Footer>
      </EntityCard>

      {open && (
        <UpdateUserModal
          user={user}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}

      {isAdmin && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          loading={archive.isPending}
          title={`Delete "${user.firstName} ${user.lastName}"?`}
          message="This user will be permanently removed. This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      )}
    </>
  );
};
