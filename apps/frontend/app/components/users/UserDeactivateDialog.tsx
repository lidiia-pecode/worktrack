"use client";

import { useQueries } from "@tanstack/react-query";

import { teamDetailsQuery } from "@/hooks/useTeams";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { fullName } from "@/lib/utils/user";
import { User } from "@/types";
import { TeamRole } from "@/types/enums";

import { ImpactDialog } from "../shared/ImpactDialog";
import { activeManagers } from "../teams/team-memberships";

interface UserDeactivateDialogProps {
  /** The person to deactivate; the dialog is open while one is given. */
  user: User | null;
  onClose: () => void;
  onDeactivated?: () => void;
}

/**
 * Deactivating someone who manages a team is allowed (decision 6): the dialog
 * names the teams it leaves without an active manager, for the owner to fix.
 */
export const UserDeactivateDialog = ({
  user,
  onClose,
  onDeactivated,
}: UserDeactivateDialogProps) => {
  const { archive } = useUsersMutations();
  const details = useUserDetails(user?.id ?? "");

  const managedTeams = (details.data?.teams ?? []).filter(
    (team) => team.roleInTeam === TeamRole.MANAGER,
  );
  // A team keeps an active manager only if someone else also manages it.
  const managedTeamDetails = useQueries({
    queries: managedTeams.map((team) => teamDetailsQuery(team.id)),
  });
  const teamsLeftWithoutManager = managedTeams.filter((_, index) => {
    const team = managedTeamDetails[index]?.data;
    return team && activeManagers(team).every(({ id }) => id === user?.id);
  });

  const isReady =
    Boolean(details.data) &&
    managedTeamDetails.every((query) => query.data !== undefined);

  const confirm = () => {
    if (!user) return;

    archive.mutate(user.id, {
      onSuccess: () => {
        onClose();
        onDeactivated?.();
      },
    });
  };

  return (
    <ImpactDialog
      isOpen={Boolean(user)}
      title={user ? `Deactivate ${fullName(user)}?` : ""}
      description={
        details.isError
          ? "Could not check which teams they manage. Close this and try again."
          : "They can no longer sign in. They stay in their team and on their projects, and their plans are kept. Reactivating them brings their access back."
      }
      affected={[
        {
          label: "Left without an active manager",
          entities: teamsLeftWithoutManager.map((team) => ({
            entity: { type: "team", id: team.id },
            name: team.name,
          })),
        },
      ]}
      confirmText="Deactivate"
      confirmVariant="destructive"
      onConfirm={confirm}
      onClose={onClose}
      loading={archive.isPending}
      confirmDisabled={!isReady}
    />
  );
};
