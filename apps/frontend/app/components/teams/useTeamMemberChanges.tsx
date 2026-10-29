"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamMembers } from "@/hooks/useTeams";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { fullName } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { TeamRole, UserRole } from "@/types/enums";

import { ImpactDialog } from "../shared/ImpactDialog";
import { MemberChange, memberChangeCopy } from "./team-member-changes";
import { MembershipWithUser } from "./team-memberships";
import { TeamMemberRemoveDialog, TeamRemoval } from "./TeamMemberRemoveDialog";

type RoleChange = Extract<MemberChange, { kind: "role" }>;

/** Role changes and removals in a team, each confirmed with who sees whom afterwards. */
export const useTeamMemberChanges = (team: Team) => {
  const { user: viewer } = useAuth();
  const { updateMember } = useTeamMembers(team.id);
  const { update: updateUser } = useUsersMutations();
  const [change, setChange] = useState<RoleChange | null>(null);
  const [removal, setRemoval] = useState<TeamRemoval | null>(null);
  const [membershipToPromote, setMembershipToPromote] =
    useState<MembershipWithUser | null>(null);
  // A switch to Member moves them out of the team they are a member of.
  const needsPersonDetails = change?.roleInTeam === TeamRole.MEMBER;
  const changedPerson = useUserDetails(
    needsPersonDetails ? change.membership.userId : "",
  );
  const otherMemberTeam =
    changedPerson.data?.teams.find(
      (personTeam) =>
        personTeam.roleInTeam === TeamRole.MEMBER && personTeam.id !== team.id,
    ) ?? null;

  // A second click while one change saves would act on stale details.
  const isBusy = updateMember.isPending;

  // Leading a team takes the Manager role, which an employee is given first.
  const changeRole = (membership: MembershipWithUser, roleInTeam: TeamRole) => {
    if (isBusy || roleInTeam === membership.roleInTeam) return;

    const needsPromotion =
      roleInTeam === TeamRole.MANAGER &&
      membership.user.role === UserRole.EMPLOYEE;

    if (needsPromotion) setMembershipToPromote(membership);
    else setChange({ kind: "role", membership, roleInTeam });
  };

  const remove = (membership: MembershipWithUser) => {
    if (!isBusy) setRemoval({ teamId: team.id, userId: membership.userId });
  };

  const changeCopy =
    change &&
    memberChangeCopy(change, team, {
      isOwner: viewer?.role === UserRole.OWNER,
      otherTeamsCount: (changedPerson.data?.teams ?? []).filter(
        (personTeam) => personTeam.id !== team.id,
      ).length,
      otherMemberTeam,
    });

  const confirmChange = () => {
    if (!change) return;
    updateMember.mutate(
      {
        membershipId: change.membership.id,
        data: {
          roleInTeam: change.roleInTeam,
          leaveCurrentTeam: Boolean(otherMemberTeam),
        },
      },
      { onSuccess: () => setChange(null) },
    );
  };

  const confirmPromotion = () => {
    if (!membershipToPromote) return;

    updateUser.mutate(
      { id: membershipToPromote.user.id, data: { role: UserRole.MANAGER } },
      {
        onSuccess: () =>
          updateMember.mutate(
            {
              membershipId: membershipToPromote.id,
              data: { roleInTeam: TeamRole.MANAGER },
            },
            { onSuccess: () => setMembershipToPromote(null) },
          ),
      },
    );
  };

  const dialogs = (
    <>
      <ImpactDialog
        isOpen={Boolean(change)}
        title={changeCopy?.title ?? ""}
        description={
          needsPersonDetails && changedPerson.isError
            ? "Could not check their other teams. Close this and try again."
            : (changeCopy?.description ?? "")
        }
        confirmText={changeCopy?.confirmText ?? ""}
        confirmVariant={changeCopy?.confirmVariant}
        onConfirm={confirmChange}
        onClose={() => setChange(null)}
        loading={isBusy}
        confirmDisabled={needsPersonDetails && !changedPerson.data}
      />

      <TeamMemberRemoveDialog
        removal={removal}
        onClose={() => setRemoval(null)}
      />

      <ImpactDialog
        isOpen={Boolean(membershipToPromote)}
        title={
          membershipToPromote
            ? `Make ${fullName(membershipToPromote.user)} a Manager and the manager of ${team.name}?`
            : ""
        }
        description="Only a Manager can lead a team, so they get the Manager role first. A Manager sees and corrects the time, absences and plans of the people in the teams they lead, and reads their reports."
        confirmText="Make manager"
        onConfirm={confirmPromotion}
        onClose={() => setMembershipToPromote(null)}
        loading={updateUser.isPending || updateMember.isPending}
      />
    </>
  );

  return {
    changeRole,
    remove,
    dialogs,
  };
};
