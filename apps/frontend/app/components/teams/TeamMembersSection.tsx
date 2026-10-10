"use client";

import { useState } from "react";

import { UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamMembers } from "@/hooks/useTeams";
import { useUserDetails, useUsersMutations } from "@/hooks/useUsers";
import { Team, TeamUser } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole } from "@/types/enums";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { fullName } from "@/lib/utils/user";
import { formatDayMonthYearLabel } from "@/lib/utils/date";

import { AssignedList } from "../shared/resource/AssignedList";
import { Avatar } from "../shared/Avatar";
import { ImpactDialog } from "../shared/ImpactDialog";
import { FormSelect } from "../shared/FormSelect";
import { MemberChange, memberChangeCopy } from "./team-member-changes";
import { currentMemberships } from "./team-memberships";

const roleOptions = [TeamRole.MEMBER, TeamRole.MANAGER].map((value) => ({
  label: TEAM_ROLE_LABELS[value],
  value,
}));

const roleLabel = (role: TeamRole) => TEAM_ROLE_LABELS[role];

interface TeamMembersSectionProps {
  team: Team;
  onOpenAddMembers: () => void;
}

export const TeamMembersSection = ({
  team,
  onOpenAddMembers,
}: TeamMembersSectionProps) => {
  const { user } = useAuth();
  const { updateMember, removeMember } = useTeamMembers(team.id);
  const { update: updateUser } = useUsersMutations();
  const [personToPromote, setPersonToPromote] = useState<TeamUser | null>(null);
  const [change, setChange] = useState<MemberChange | null>(null);
  // Whether a removal leaves them in no team the viewer can see.
  const changedPerson = useUserDetails(
    change?.kind === "remove" ? change.membership.userId : "",
  );

  const isOwner = user?.role === UserRole.OWNER;

  if (team.status === TeamStatus.ARCHIVED) {
    return <ArchivedTeamMembers team={team} />;
  }

  const confirmPromotion = () => {
    if (!personToPromote) return;

    updateUser.mutate(
      { id: personToPromote.id, data: { role: UserRole.MANAGER } },
      { onSuccess: () => setPersonToPromote(null) },
    );
  };

  const activeMembers = currentMemberships(team);

  const changeCopy =
    change &&
    memberChangeCopy(change, team, {
      isOwner,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Members</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeMembers.length}{" "}
            {activeMembers.length === 1 ? "person is" : "people are"} on this
            team.
          </p>
        </div>

        {isOwner && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAddMembers}
            className="gap-1.5"
          >
            <UserPlus className="size-4" />
            Add members
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <AssignedList
          items={activeMembers}
          getId={(membership) => membership.id}
          getPrimary={(membership) => fullName(membership.user)}
          getSecondary={(membership) => membership.user.email}
          renderLeading={(membership) => (
            <Avatar user={membership.user} size="md" />
          )}
          emptyMessage={
            isOwner
              ? "No members yet. Click 'Add members' to get started."
              : "No members yet. An owner adds people to this team."
          }
          renderTrailing={(membership) => (
            <>
              {isOwner && membership.user.role === UserRole.MANAGER ? (
                <FormSelect
                  aria-label={`Role for ${membership.user.firstName}`}
                  value={membership.roleInTeam}
                  options={roleOptions}
                  onValueChange={(roleInTeam) =>
                    setChange({
                      kind: "role",
                      membership,
                      roleInTeam: roleInTeam as TeamRole,
                    })
                  }
                  disabled={updateMember.isPending}
                  className="w-auto"
                  triggerClassName="h-8 w-auto gap-2 px-2.5 text-xs"
                />
              ) : (
                <Badge>{roleLabel(membership.roleInTeam)}</Badge>
              )}

              {isOwner && membership.user.role === UserRole.EMPLOYEE && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  aria-label={`Make ${membership.user.firstName} a Manager`}
                  onClick={() => setPersonToPromote(membership.user)}
                >
                  Make Manager
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="iconSm"
                aria-label={`Remove ${membership.user.firstName}`}
                onClick={() => setChange({ kind: "remove", membership })}
                disabled={removeMember.isPending}
              >
                <X className="size-4" />
              </Button>
            </>
          )}
        />
      </div>

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
    </div>
  );
};

const ArchivedTeamMembers = ({ team }: { team: Team }) => {
  const formerMembers = (team.memberships ?? []).filter(
    (m): m is typeof m & { user: NonNullable<typeof m.user> } => !!m.user,
  );

  const period = (joinedAt: string, leftAt?: string | null) =>
    leftAt
      ? `${formatDayMonthYearLabel(joinedAt)} – ${formatDayMonthYearLabel(leftAt)}`
      : `Since ${formatDayMonthYearLabel(joinedAt)}`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Former members
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Who was on this team and when. Restoring it starts with no members.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <AssignedList
          items={formerMembers}
          getId={(membership) => membership.id}
          getPrimary={(membership) => fullName(membership.user)}
          getSecondary={(membership) =>
            period(membership.joinedAt, membership.leftAt)
          }
          renderLeading={(membership) => (
            <Avatar user={membership.user} size="md" />
          )}
          emptyMessage="Nobody was on this team."
          renderTrailing={(membership) => (
            <Badge>{roleLabel(membership.roleInTeam)}</Badge>
          )}
        />
      </div>
    </div>
  );
};
