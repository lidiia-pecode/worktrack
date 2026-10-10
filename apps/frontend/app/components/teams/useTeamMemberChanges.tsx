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
import { CurrentMembership } from "./team-memberships";

/**
 * Changes who is on a team and in what role, each saved at once. A new role
 * or a removal confirms first, saying who sees whom afterwards.
 */
export const useTeamMemberChanges = (team: Team) => {
  const { user: viewer } = useAuth();
  const { updateMember, removeMember } = useTeamMembers(team.id);
  const { update: updateUser } = useUsersMutations();
  const [change, setChange] = useState<MemberChange | null>(null);
  const [membershipToPromote, setMembershipToPromote] =
    useState<CurrentMembership | null>(null);
  // Whether a removal leaves them in no team the viewer can see.
  const changedPerson = useUserDetails(
    change?.kind === "remove" ? change.membership.userId : "",
  );

  // A second click while one change saves would act on stale details.
  const isBusy = updateMember.isPending || removeMember.isPending;

  const changeRole = (membership: CurrentMembership, roleInTeam: TeamRole) => {
    if (!isBusy) setChange({ kind: "role", membership, roleInTeam });
  };

  const remove = (membership: CurrentMembership) => {
    if (!isBusy) setChange({ kind: "remove", membership });
  };

  const changeCopy =
    change &&
    memberChangeCopy(change, team, {
      isOwner: viewer?.role === UserRole.OWNER,
      otherTeamsCount: (changedPerson.data?.teams ?? []).filter(
        (personTeam) => personTeam.id !== team.id,
      ).length,
    });

  const confirmChange = () => {
    if (!change) return;
    const done = { onSuccess: () => setChange(null) };

    if (change.kind === "remove") {
      removeMember.mutate(change.membership.id, done);
      return;
    }

    updateMember.mutate(
      {
        membershipId: change.membership.id,
        data: { roleInTeam: change.roleInTeam },
      },
      done,
    );
  };

  // Leading a team takes the Manager role, so an employee gets it first.
  const confirmPromotion = () => {
    if (!membershipToPromote) return;
    const done = { onSuccess: () => setMembershipToPromote(null) };

    updateUser.mutate(
      { id: membershipToPromote.user.id, data: { role: UserRole.MANAGER } },
      {
        onSuccess: () =>
          updateMember.mutate(
            {
              membershipId: membershipToPromote.id,
              data: { roleInTeam: TeamRole.MANAGER },
            },
            done,
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
          change?.kind === "remove" && changedPerson.isError
            ? "Could not check their other teams. Close this and try again."
            : (changeCopy?.description ?? "")
        }
        confirmText={changeCopy?.confirmText ?? ""}
        confirmVariant={change?.kind === "remove" ? "destructive" : "primary"}
        onConfirm={confirmChange}
        onClose={() => setChange(null)}
        loading={updateMember.isPending || removeMember.isPending}
        confirmDisabled={change?.kind === "remove" && !changedPerson.data}
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
    promote: (membership: CurrentMembership) => {
      if (!isBusy) setMembershipToPromote(membership);
    },
    dialogs,
  };
};
