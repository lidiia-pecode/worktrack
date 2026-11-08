"use client";

import { useState } from "react";
import { UserCheck, UserX } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { isDeactivatedUser } from "@/lib/utils/user";
import { User } from "@/types";
import { UserRole } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import type { ManageRowAction } from "../shared/resource/ManageList";
import { UserDeactivateDialog } from "./UserDeactivateDialog";
import { UserReactivateDialog } from "./UserReactivateDialog";

/** What the viewer can do with a person, from a list row or the panel. */
export const useUserActions = () => {
  const { user: viewer } = useAuth();
  const isOwner = viewer?.role === UserRole.OWNER;
  const panel = useEntityPanel();

  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [reactivatingUser, setReactivatingUser] = useState<User | null>(null);

  // An owner isn't deactivated here, as the API refuses; they edit only
  // their own position and working hours.
  const managesPerson = (user: User) => isOwner && user.role !== UserRole.OWNER;
  const isViewer = (user: User) => user.id === viewer?.id;

  const canEdit = (user: User) =>
    (managesPerson(user) || (isOwner && isViewer(user))) &&
    !isDeactivatedUser(user);

  const actionsFor = (user: User): ManageRowAction[] => {
    if (!managesPerson(user)) return [];

    return isDeactivatedUser(user)
      ? [
          {
            label: "Reactivate",
            icon: UserCheck,
            onSelect: () => setReactivatingUser(user),
          },
        ]
      : [
          {
            label: "Deactivate",
            icon: UserX,
            warning: true,
            onSelect: () => setDeactivatingUser(user),
          },
        ];
  };

  const dialogs = (
    <>
      <UserDeactivateDialog
        user={deactivatingUser}
        onClose={() => setDeactivatingUser(null)}
      />
      <UserReactivateDialog
        user={reactivatingUser}
        onClose={() => setReactivatingUser(null)}
      />
    </>
  );

  return {
    canEdit,
    edit: (user: User) => panel.edit({ type: "user", id: user.id }),
    actionsFor,
    dialogs,
  };
};
