"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamMembers } from "@/hooks/useTeams";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { todayISODate } from "@/lib/utils/date";
import { fullName } from "@/lib/utils/user";
import { Team, TeamUser } from "@/types/Team";
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
  const { timezone } = useWorkSettings();
  const { addMember, updateMember, removeMember } = useTeamMembers(team.id);
  const { update: updateUser } = useUsersMutations();
  const [change, setChange] = useState<MemberChange | null>(null);
  const [personToPromote, setPersonToPromote] = useState<TeamUser | null>(null);
  // Whether a removal leaves them in no team the viewer can see.
  const changedPerson = useUserDetails(
    change?.kind === "remove" ? change.membership.userId : "",
  );

  // A second click while one change saves would act on stale details.
  const isBusy =
    addMember.isPending || updateMember.isPending || removeMember.isPending;

  const add = (userId: string, roleInTeam: TeamRole) => {
    if (isBusy) return;

    addMember.mutate({
      userId,
      roleInTeam,
      joinedAt: todayISODate(timezone),
    });
  };

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

  const confirmPromotion = () => {
    if (!personToPromote) return;

    updateUser.mutate(
      { id: personToPromote.id, data: { role: UserRole.MANAGER } },
      { onSuccess: () => setPersonToPromote(null) },
    );
  };

  const dialogs = (
    <>
      <ImpactDialog
        isOpen={Boolean(change)}
        title={changeCopy?.title ?? ""}
        description={changeCopy?.description ?? ""}
        confirmText={changeCopy?.confirmText ?? ""}
        confirmVariant={change?.kind === "remove" ? "destructive" : "primary"}
        onConfirm={confirmChange}
        onClose={() => setChange(null)}
        loading={updateMember.isPending || removeMember.isPending}
        confirmDisabled={change?.kind === "remove" && !changedPerson.data}
      />

      <ImpactDialog
        isOpen={Boolean(personToPromote)}
        title={
          personToPromote ? `Make ${fullName(personToPromote)} a Manager?` : ""
        }
        description="A Manager can lead teams. They see and correct the time, absences and plans of the people in the teams they lead, and read their reports. You can then make them this team's manager."
        confirmText="Make Manager"
        onConfirm={confirmPromotion}
        onClose={() => setPersonToPromote(null)}
        loading={updateUser.isPending}
      />
    </>
  );

  return {
    add,
    changeRole,
    remove,
    promote: setPersonToPromote,
    dialogs,
  };
};
