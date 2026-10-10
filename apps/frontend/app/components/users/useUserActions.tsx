"use client";

import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { isDeactivatedUser } from "@/lib/utils/user";
import { User } from "@/types";
import { UserRole } from "@/types/enums";

import type { ManageRowAction } from "../shared/resource/ManageList";
import { UpdateUserModal } from "./UpdateUserModal";

/** What the viewer can do with a person, from a list row or the panel. */
export const useUserActions = () => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const { archive, unarchive } = useUsersMutations();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  // The form stays open after saving, so it reads the person as they are now.
  const { data: savedUser } = useUserDetails(editingUser?.id ?? "");

  // A manager opens the form too, to manage a person's projects; a deactivated
  // person is read-only for everyone.
  const canEdit = (user: User) => !isDeactivatedUser(user);

  // Deactivating and reactivating are the owner's.
  const actionsFor = (user: User): ManageRowAction[] => {
    if (!isOwner) return [];

    return isDeactivatedUser(user)
      ? [
          {
            label: "Reactivate",
            icon: UserCheck,
            onSelect: () => unarchive.mutate(user.id),
          },
        ]
      : [
          {
            label: "Deactivate",
            icon: UserX,
            destructive: true,
            onSelect: () => archive.mutate(user.id),
          },
        ];
  };

  const dialogs = editingUser && (
    <UpdateUserModal
      user={savedUser ?? editingUser}
      onClose={() => setEditingUser(null)}
    />
  );

  return { canEdit, edit: setEditingUser, actionsFor, dialogs };
};
