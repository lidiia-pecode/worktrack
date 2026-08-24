"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";

import { useTeamMembers } from "@/hooks/useTeams";
import { useUsers } from "@/hooks/useUsers";
import { Team } from "@/types/Team";
import { TeamRole } from "@/types/enums";

import { MemberChip } from "../shared/MemberChip";
import { MemberList } from "../shared/MemberList";
import { MemberPicker } from "../shared/MemberPicker";
import Select from "../shared/Select";

const roleOptions = [
  { label: "Member", value: TeamRole.MEMBER },
  { label: "Manager", value: TeamRole.MANAGER },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface TeamMembersSectionProps {
  team: Team;
}

export function TeamMembersSection({ team }: TeamMembersSectionProps) {
  const { items: users, isLoading: usersLoading } = useUsers();
  const { addMember, updateMember, removeMember } = useTeamMembers(team.id);

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<TeamRole>(TeamRole.MEMBER);
  const [pendingJoinedAt, setPendingJoinedAt] = useState(todayIso());

  const activeMembers = (team.memberships ?? []).filter(
    (m): m is typeof m & { user: NonNullable<typeof m.user> } =>
      !m.leftAt && !!m.user,
  );

  const pendingUser = users.find((u) => u.id === pendingUserId);

  const handleAdd = () => {
    if (!pendingUserId) return;

    addMember.mutate(
      {
        userId: pendingUserId,
        roleInTeam: pendingRole,
        joinedAt: pendingJoinedAt,
      },
      {
        onSuccess: () => {
          setPendingUserId(null);
          setPendingRole(TeamRole.MEMBER);
          setPendingJoinedAt(todayIso());
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Members</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {activeMembers.length}{" "}
          {activeMembers.length === 1 ? "person is" : "people are"} on this
          team.
        </p>
      </div>

      <MemberList
        items={activeMembers}
        emptyMessage="No members yet. Add someone below."
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

      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Add a member
        </p>

        {pendingUser ? (
          <div className="flex flex-wrap items-center gap-3">
            <MemberChip
              user={pendingUser}
              onRemove={() => setPendingUserId(null)}
            />

            <Select
              aria-label="Role"
              value={pendingRole}
              onChange={(event) =>
                setPendingRole(event.target.value as TeamRole)
              }
              className="w-auto"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Input
              type="date"
              aria-label="Joined date"
              value={pendingJoinedAt}
              onChange={(event) => setPendingJoinedAt(event.target.value)}
              className="w-auto"
            />

            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              isLoading={addMember.isPending}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Add
            </Button>
          </div>
        ) : (
          <MemberPicker
            candidates={users}
            excludeIds={activeMembers.map((m) => m.userId)}
            onSelect={(user) => setPendingUserId(user.id)}
            isLoading={usersLoading}
          />
        )}

        {addMember.isError && (
          <p className="mt-2 text-xs text-destructive">
            Couldn&apos;t add this person — they may already be on the team.
          </p>
        )}
      </div>
    </div>
  );
}
