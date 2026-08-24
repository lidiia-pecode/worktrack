"use client";

import { UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTeamMembers } from "@/hooks/useTeams";
import { Team } from "@/types/Team";
import { TeamRole } from "@/types/enums";
import { fullName } from "@/lib/utils/user";

import { AssignedList } from "../shared/resourse/AssignedList";
import { Avatar } from "../shared/Avatar";
import Select from "../shared/Select";

const roleOptions = [
  { label: "Member", value: TeamRole.MEMBER },
  { label: "Manager", value: TeamRole.MANAGER },
];

interface TeamMembersSectionProps {
  team: Team;
  onOpenAddMembers: () => void;
}

export function TeamMembersSection({
  team,
  onOpenAddMembers,
}: TeamMembersSectionProps) {
  const { updateMember, removeMember } = useTeamMembers(team.id);

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
          emptyMessage="No members yet. Click 'Add members' to get started."
          renderTrailing={(membership) => (
            <>
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
    </div>
  );
}
