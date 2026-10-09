"use client";

import { useTeamArchiveImpact, useTeamsMutations } from "@/hooks/useTeams";
import { fullName } from "@/lib/utils/user";
import { Team, TeamArchiveImpact, TeamUser } from "@/types/Team";

import { ConfirmModal } from "../shared/ConfirmModal";

const namesOf = (users: TeamUser[]) =>
  new Intl.ListFormat("en", { type: "conjunction" }).format(
    users.map(fullName),
  );

const archiveImpactMessage = (impact?: TeamArchiveImpact) => {
  if (!impact) return "Checking who this affects...";

  const { managers, peopleLeftWithoutTeam } = impact;
  const effects = [
    managers.length > 0 &&
      `${namesOf(managers)} will no longer manage this team.`,
    peopleLeftWithoutTeam.length > 0 &&
      `${namesOf(peopleLeftWithoutTeam)} will be left without a team, for you to place in another one.`,
    managers.length === 0 &&
      peopleLeftWithoutTeam.length === 0 &&
      "Nobody will be left without a team.",
  ].filter(Boolean);

  return [
    ...effects,
    "Time, absences and plans stay as they are. Restoring the team later brings it back with no members.",
  ].join(" ");
};

interface TeamArchiveDialogProps {
  /** The team to archive; the dialog is open while one is given. */
  team: Team | null;
  onClose: () => void;
  onArchived?: () => void;
}

export const TeamArchiveDialog = ({
  team,
  onClose,
  onArchived,
}: TeamArchiveDialogProps) => {
  const { archive } = useTeamsMutations();
  const archiveImpact = useTeamArchiveImpact(team?.id ?? "", Boolean(team));

  const confirmArchive = () => {
    if (!team || !archiveImpact.data) return;

    archive.mutate(team.id, {
      onSuccess: () => {
        onClose();
        onArchived?.();
      },
    });
  };

  return (
    <ConfirmModal
      isOpen={Boolean(team)}
      title={team ? `Archive ${team.name}?` : ""}
      message={
        archiveImpact.isError
          ? "Could not check who this affects. Close this and try again."
          : archiveImpactMessage(archiveImpact.data)
      }
      confirmText="Archive"
      variant="danger"
      onConfirm={confirmArchive}
      onClose={onClose}
      loading={archive.isPending}
      confirmDisabled={!archiveImpact.data}
    />
  );
};
