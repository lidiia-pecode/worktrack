"use client";

import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { byCount } from "@/lib/utils/text";
import { fullName } from "@/lib/utils/user";
import { User } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { linkedEntities } from "../entity-panel/EntityLink";
import { ImpactDialog } from "../shared/ImpactDialog";

interface UserReactivateDialogProps {
  /** The dialog is open while this is set. */
  user: User | null;
  onClose: () => void;
}

/** Reactivating someone brings back their sign-in and their expected hours; the dialog names what they come back to. */
export const UserReactivateDialog = ({
  user,
  onClose,
}: UserReactivateDialogProps) => {
  const { unarchive } = useUsersMutations();
  const details = useUserDetails(user?.id ?? "");

  const teams = details.data?.teams ?? [];
  const activeProjects = (details.data?.projects ?? []).filter(
    (project) => project.status === ProjectStatus.ACTIVE,
  );

  const confirm = () => {
    if (!user) return;

    unarchive.mutate(user.id, {
      onSuccess: onClose,
    });
  };

  return (
    <ImpactDialog
      isOpen={Boolean(user)}
      title={user ? `Reactivate ${fullName(user)}?` : ""}
      description={
        details.isError
          ? "Could not check their teams and projects. Close this and try again."
          : "They can sign in again from now, with their hours expected again from today. Reactivate only if they're coming back; to correct their last month, edit it on Team time."
      }
      affected={[
        {
          label: byCount(
            teams.length,
            "Back in their team",
            "Back in their teams",
          ),
          entities: linkedEntities("team", teams),
        },
        {
          label: "Back on their projects",
          entities: linkedEntities("project", activeProjects),
        },
      ]}
      confirmText="Reactivate"
      confirmVariant="success"
      onConfirm={confirm}
      onClose={onClose}
      loading={unarchive.isPending}
      confirmDisabled={!details.data}
    />
  );
};
