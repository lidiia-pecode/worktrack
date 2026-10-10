"use client";

import { useTeamArchiveImpact, useTeamsMutations } from "@/hooks/useTeams";
import { fullName } from "@/lib/utils/user";
import { Team, TeamUser } from "@/types/Team";

import { ImpactDialog } from "../shared/ImpactDialog";

const asPeople = (users: TeamUser[]) =>
  users.map((user) => ({
    entity: { type: "user" as const, id: user.id },
    name: fullName(user),
  }));

interface TeamArchiveDialogProps {
  /** The dialog is open while this is set. */
  team: Team | null;
  onClose: () => void;
}

export const TeamArchiveDialog = ({
  team,
  onClose,
}: TeamArchiveDialogProps) => {
  const { archive } = useTeamsMutations();
  const impact = useTeamArchiveImpact(team?.id ?? "", Boolean(team));

  const confirmArchive = () => {
    if (!team || !impact.data) return;

    archive.mutate(team.id, {
      onSuccess: onClose,
    });
  };

  const description = impact.isError
    ? "Could not check who this affects. Close this and try again."
    : !impact.data
      ? "Checking who this affects..."
      : "Everyone leaves the team today and its pending invitations are revoked. Time, absences and plans stay as they are, and restoring it brings it back with no members.";

  return (
    <ImpactDialog
      isOpen={Boolean(team)}
      title={team ? `Archive ${team.name}?` : ""}
      description={description}
      affected={[
        {
          label: "No longer managing it",
          entities: asPeople(impact.data?.managers ?? []),
        },
        {
          label: "Left without a team, so only you see them",
          entities: asPeople(impact.data?.peopleLeftWithoutTeam ?? []),
        },
      ]}
      confirmText="Archive"
      confirmVariant="destructive"
      onConfirm={confirmArchive}
      onClose={onClose}
      loading={archive.isPending}
      confirmDisabled={!impact.data}
    />
  );
};
