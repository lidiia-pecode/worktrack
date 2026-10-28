"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamDetails, useTeamMembers } from "@/hooks/useTeams";
import { useUserDetails } from "@/hooks/useUsers";
import { UserRole } from "@/types/enums";

import { ImpactDialog } from "../shared/ImpactDialog";
import { memberChangeCopy } from "./team-member-changes";
import { currentMemberships } from "./team-memberships";

export interface TeamRemoval {
  teamId: string;
  userId: string;
}

interface TeamMemberRemoveDialogProps {
  /** The dialog is open while this is set. */
  removal: TeamRemoval | null;
  onClose: () => void;
}

/**
 * Removes someone from a team, from the team's panel or the person's: it says
 * whether the team is left without a manager and whether the viewer stops
 * seeing them.
 */
export const TeamMemberRemoveDialog = ({
  removal,
  onClose,
}: TeamMemberRemoveDialogProps) => {
  const { user: viewer } = useAuth();
  const team = useTeamDetails(removal?.teamId ?? null);
  const person = useUserDetails(removal?.userId ?? "");
  const { removeMember } = useTeamMembers(removal?.teamId ?? "");

  const membership =
    team.data &&
    currentMemberships(team.data).find(
      ({ userId }) => userId === removal?.userId,
    );
  const copy =
    team.data &&
    membership &&
    person.data &&
    memberChangeCopy({ kind: "remove", membership }, team.data, {
      isOwner: viewer?.role === UserRole.OWNER,
      otherTeamsCount: person.data.teams.filter(
        ({ id }) => id !== removal?.teamId,
      ).length,
    });

  return (
    <ImpactDialog
      isOpen={Boolean(removal)}
      title={copy ? copy.title : "Remove from the team?"}
      description={
        team.isError || person.isError
          ? "Could not check their teams. Close this and try again."
          : (copy?.description ?? "Checking their teams...")
      }
      confirmText="Remove"
      confirmVariant="destructive"
      onConfirm={() =>
        membership && removeMember.mutate(membership.id, { onSuccess: onClose })
      }
      onClose={onClose}
      loading={removeMember.isPending}
      confirmDisabled={!copy}
    />
  );
};
