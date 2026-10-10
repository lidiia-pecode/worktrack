"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldLabelClassName } from "@/components/ui/field";
import { useServerSearch } from "@/hooks/useManageListState";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { fullName, initials } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { TeamRole, UserRole, UserStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { activeManagers, currentMemberships } from "./team-memberships";
import type { useTeamMemberChanges } from "./useTeamMemberChanges";

export const MEMBERS_PICKER = "add-members";

const TEAM_ROLES = [TeamRole.MANAGER, TeamRole.MEMBER];

// Only someone with the Manager role can lead a team; employees join as members.
const USER_ROLE_FOR: Record<TeamRole, UserRole> = {
  [TeamRole.MANAGER]: UserRole.MANAGER,
  [TeamRole.MEMBER]: UserRole.EMPLOYEE,
};

interface TeamMembersPickerProps {
  team: Team;
  changes: ReturnType<typeof useTeamMemberChanges>;
}

export const TeamMembersPicker = ({
  team,
  changes,
}: TeamMembersPickerProps) => {
  // A team without a manager most likely needs one first.
  const [roleInTeam, setRoleInTeam] = useState(
    activeManagers(team).length === 0 ? TeamRole.MANAGER : TeamRole.MEMBER,
  );
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useAssignableUsersInfiniteQuery(
    {
      status: UserStatus.ACTIVE,
      role: USER_ROLE_FOR[roleInTeam],
      search: searchQuery,
    },
    { keepPreviousData: true },
  );

  const memberships = currentMemberships(team);
  const memberIds = memberships.map((membership) => membership.userId);

  const toggle = (userId: string) => {
    const membership = memberships.find((item) => item.userId === userId);

    if (membership) changes.remove(membership);
    else changes.add(userId, roleInTeam);
  };

  return (
    <PanelView
      title={`Add members to ${team.name}`}
      description="Each choice saves at once. Choose someone again to remove them."
    >
      <div role="group" aria-labelledby="team-picker-role">
        <p id="team-picker-role" className={fieldLabelClassName}>
          Add as
        </p>

        <div className="flex gap-2">
          {TEAM_ROLES.map((role) => (
            <Button
              key={role}
              type="button"
              size="sm"
              variant={role === roleInTeam ? "primary" : "outline"}
              aria-pressed={role === roleInTeam}
              onClick={() => setRoleInTeam(role)}
            >
              {TEAM_ROLE_LABELS[role]}
            </Button>
          ))}
        </div>
      </div>

      <EntityPicker
        className="mt-4"
        items={items}
        selectedIds={memberIds}
        onToggle={toggle}
        getId={(person) => person.id}
        getLabel={fullName}
        getSubtitle={(person) => person.email}
        getAvatarText={initials}
        onSearchChange={setSearch}
        isLoading={isLoading}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        emptyMessage={
          roleInTeam === TeamRole.MANAGER
            ? "Nobody has the Manager role yet. Change someone's role in their panel first."
            : "No employees to add yet."
        }
        searchPlaceholder="Search people..."
      />
    </PanelView>
  );
};
