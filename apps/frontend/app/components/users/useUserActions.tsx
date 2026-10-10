"use client";

import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useUsersMutations } from "@/hooks/useUsers";
import { isDeactivatedUser } from "@/lib/utils/user";
import { User } from "@/types";
import { UserRole } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import type { ManageRowAction } from "../shared/resource/ManageList";
import { UserDeactivateDialog } from "./UserDeactivateDialog";

/** What the viewer can do with a person, from a list row or the panel. */
export const useUserActions = () => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const { unarchive } = useUsersMutations();
  const panel = useEntityPanel();

  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  // An owner, the viewer included, is reached only through a project link.
  // The form can't keep the Owner role and the API refuses to deactivate one.
  const managesPerson = (user: User) => isOwner && user.role !== UserRole.OWNER;

  const canEdit = (user: User) =>
    managesPerson(user) && !isDeactivatedUser(user);

  const actionsFor = (user: User): ManageRowAction[] => {
    if (!managesPerson(user)) return [];

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
            onSelect: () => setDeactivatingUser(user),
          },
        ];
  };

  const dialogs = (
    <UserDeactivateDialog
      user={deactivatingUser}
      onClose={() => setDeactivatingUser(null)}
    />
  );

  return {
    canEdit,
    edit: (user: User) => panel.edit({ type: "user", id: user.id }),
    actionsFor,
    dialogs,
  };
};
