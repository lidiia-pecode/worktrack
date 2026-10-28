"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  useTeamArchiveImpact,
  useTeamMembers,
  useTeamsMutations,
} from "@/hooks/useTeams";
import { byCount, countLabel } from "@/lib/utils/text";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Team, TeamArchiveImpact } from "@/types/Team";
import { TeamRole } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { ImpactDialog } from "../shared/ImpactDialog";

type OpenMembership = TeamArchiveImpact["openMemberships"][number];

const asPeople = (memberships: OpenMembership[]) =>
  memberships.map(({ user }) => ({
    entity: { type: "user" as const, id: user.id },
    name: fullName(user),
  }));

interface TeamArchiveDialogProps {
  /** The dialog is open while this is set. */
  team: Team | null;
  onClose: () => void;
}

/**
 * Archives an empty team. A team that still has anyone on it, or invitations
 * waiting, is emptied on its panel first; the dialog says what is left.
 */
export const TeamArchiveDialog = ({
  team,
  onClose,
}: TeamArchiveDialogProps) => {
  const panel = useEntityPanel();
  const { archive } = useTeamsMutations();
  const { removeMember } = useTeamMembers(team?.id ?? "");
  const impact = useTeamArchiveImpact(team?.id ?? "", Boolean(team));

  const open = impact.data?.openMemberships ?? [];
  const invitationCount = impact.data?.pendingInvitationCount ?? 0;
  const deactivated = open.filter(({ user }) => isDeactivatedUser(user));
  const active = open.filter(({ user }) => !isDeactivatedUser(user));
  const ofRole = (role: TeamRole) =>
    active.filter((membership) => membership.roleInTeam === role);
  const isEmpty = open.length === 0 && invitationCount === 0;
  const [isRemovingDeactivated, setIsRemovingDeactivated] = useState(false);

  // The dialog itself is the confirmation: a deactivated person can only be removed.
  // The button stays busy until the refreshed list no longer shows them.
  const removeDeactivated = async () => {
    setIsRemovingDeactivated(true);
    try {
      for (const membership of deactivated) {
        await removeMember.mutateAsync(membership.id);
      }
    } catch {
      // The failure has its toast already; the refetch shows who is left.
    }
    await impact.refetch();
    setIsRemovingDeactivated(false);
  };

  if (!team) return null;

  const teamRef = { type: "team" as const, id: team.id };
  const isOnTeamPanel =
    panel.current?.type === teamRef.type && panel.current.id === team.id;
  // From the Teams list, the way to the panel where the team is emptied.
  const teamPanel = isOnTeamPanel ? (
    "this panel"
  ) : (
    <EntityLink entity={teamRef} onNavigate={onClose}>
      the team&apos;s panel
    </EntityLink>
  );
  const invitations = countLabel(
    invitationCount,
    "waiting invitation",
    "waiting invitations",
  );
  const peopleAndInvitations =
    invitationCount > 0
      ? `Move or remove them and revoke ${invitations}`
      : "Move or remove them";
  const stillToDo =
    active.length > 0
      ? peopleAndInvitations
      : invitationCount > 0
        ? `Revoke ${invitations}`
        : null;

  if (!impact.data || isEmpty) {
    return (
      <ImpactDialog
        isOpen
        title={`Archive ${team.name}?`}
        description={
          impact.isError
            ? "Could not check what is on the team. Close this and try again."
            : !impact.data
              ? "Checking what is on the team..."
              : "Nobody is on it. It leaves the team filters and the invite form; you can restore it from the Archived tab."
        }
        confirmText="Archive"
        confirmVariant="warning"
        onConfirm={() => archive.mutate(team.id, { onSuccess: onClose })}
        onClose={onClose}
        loading={archive.isPending}
        // A cached "empty" may be out of date until the check on opening returns.
        confirmDisabled={!impact.data || impact.isFetching}
      />
    );
  }

  return (
    <ImpactDialog
      isOpen
      title={`${team.name} can't be archived yet`}
      description="Only an empty team can be archived. Moving or removing people doesn't change their time, absences or plans."
      affected={[
        { label: "Still members", entities: asPeople(ofRole(TeamRole.MEMBER)) },
        {
          label: byCount(
            ofRole(TeamRole.MANAGER).length,
            "Manager",
            "Managers",
          ),
          entities: asPeople(ofRole(TeamRole.MANAGER)),
        },
        {
          label: "Deactivated",
          entities: asPeople(deactivated),
          action: (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void removeDeactivated()}
              isLoading={isRemovingDeactivated}
            >
              {deactivated.length === 1
                ? "Remove the deactivated person"
                : `Remove the ${deactivated.length} deactivated people`}
            </Button>
          ),
        },
      ]}
      blocker={
        stillToDo ? (
          <>
            {stillToDo} on {teamPanel}.
          </>
        ) : (
          "Once they're removed, the team can be archived."
        )
      }
      onConfirm={onClose}
      onClose={onClose}
    />
  );
};
