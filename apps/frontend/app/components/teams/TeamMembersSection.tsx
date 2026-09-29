"use client";

import { useState } from "react";

import { UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamMembers } from "@/hooks/useTeams";
import { useUsersMutations } from "@/hooks/useUsers";
import { Team, TeamUser } from "@/types/Team";
import { TeamRole, UserRole } from "@/types/enums";
import { fullName } from "@/lib/utils/user";

import { AssignedList } from "../shared/resourse/AssignedList";
import { Avatar } from "../shared/Avatar";
import { ConfirmModal } from "../shared/ConfirmModal";
import Select from "../shared/Select";

const roleOptions = [
  { label: "Member", value: TeamRole.MEMBER },
  { label: "Manager", value: TeamRole.MANAGER },
];

const roleLabel = (role: TeamRole) =>
  roleOptions.find((option) => option.value === role)?.label ?? role;

interface TeamMembersSectionProps {
  team: Team;
  onOpenAddMembers: () => void;
}

export function TeamMembersSection({
  team,
  onOpenAddMembers,
}: TeamMembersSectionProps) {
  const { user } = useAuth();
  const { updateMember, removeMember } = useTeamMembers(team.id);
  const { update: updateUser } = useUsersMutations();
  const [personToPromote, setPersonToPromote] = useState<TeamUser | null>(null);

  const isOwner = user?.role === UserRole.OWNER;

  const confirmPromotion = () => {
    if (!personToPromote) return;

    updateUser.mutate(
      { id: personToPromote.id, data: { role: UserRole.MANAGER } },
      { onSuccess: () => setPersonToPromote(null) },
    );
  };

  const activeMembers = (team.memberships ?? []).filter(
    (m): m is typeof m & { user: NonNullable<typeof m.user> } =>
      !m.leftAt && !!m.user,
  );

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
                <Select
                  aria-label={`Role for ${membership.user.firstName}`}
                  value={membership.roleInTeam}
                  onChange={(event) =>
                    updateMember.mutate({
                      membershipId: membership.id,
                      data: { roleInTeam: event.target.value as TeamRole },
                    })
                  }
                  disabled={updateMember.isPending}
                  className="h-8 w-auto py-1 text-xs"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge>{roleLabel(membership.roleInTeam)}</Badge>
              )}

              {isOwner && membership.user.role === UserRole.EMPLOYEE && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
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
                onClick={() => removeMember.mutate(membership.id)}
                disabled={removeMember.isPending}
              >
                <X className="size-4" />
              </Button>
            </>
          )}
        />
      </div>

      <ConfirmModal
        isOpen={Boolean(personToPromote)}
        title={
          personToPromote ? `Make ${fullName(personToPromote)} a Manager?` : ""
        }
        message="A Manager can lead teams. They see and correct the time, absences and plans of the people in the teams they lead, and read their reports. You can then make them this team's manager."
        confirmText="Make Manager"
        onConfirm={confirmPromotion}
        onClose={() => setPersonToPromote(null)}
        loading={updateUser.isPending}
      />
    </div>
  );
}
