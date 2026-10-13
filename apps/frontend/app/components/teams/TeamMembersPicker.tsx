"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldLabelClassName } from "@/components/ui/field";
import { useServerSearch } from "@/hooks/useManageListState";
import { useTeamMembers } from "@/hooks/useTeams";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
import { todayISODate } from "@/lib/utils/date";
import { fullName, initials } from "@/lib/utils/user";
import { Team } from "@/types/Team";
import { TeamRole, UserRole, UserStatus } from "@/types/enums";
import { nameOrCount } from "@/lib/utils/text";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import { Choice, useStagedSelection } from "../entity-panel/useStagedSelection";
import { ImpactDialog } from "../shared/ImpactDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { InviteHint } from "../users/InviteHint";
import {
  activeManagers,
  currentMemberships,
  leftWithoutManagerText,
} from "./team-memberships";

export const MEMBERS_PICKER = "add-members";

const TEAM_ROLES = [TeamRole.MANAGER, TeamRole.MEMBER];

// Only someone with the Manager role can lead a team; employees join as members.
const USER_ROLE_FOR: Record<TeamRole, UserRole> = {
  [TeamRole.MANAGER]: UserRole.MANAGER,
  [TeamRole.MEMBER]: UserRole.EMPLOYEE,
};

/** A current member carries their membership; a new one, the role they join in. */
interface MemberChoice extends Choice {
  membershipId?: string;
  roleInTeam?: TeamRole;
}

export const TeamMembersPicker = ({ team }: { team: Team }) => {
  const { timezone } = useWorkSettings();
  const { addMember, removeMember } = useTeamMembers(team.id);
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  // A team without a manager most likely needs one first.
  const [roleInTeam, setRoleInTeam] = useState(
    activeManagers(team).length === 0 ? TeamRole.MANAGER : TeamRole.MEMBER,
  );
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useAssignableUsersInfiniteQuery({
    status: UserStatus.ACTIVE,
    role: USER_ROLE_FOR[roleInTeam],
    search: searchQuery,
  });

  const staged = useStagedSelection<MemberChoice>(
    currentMemberships(team).map((membership) => ({
      id: membership.userId,
      name: fullName(membership.user),
      membershipId: membership.id,
    })),
  );

  const joiningAs = (userId: string) =>
    staged.toAdd.find((choice) => choice.id === userId)?.roleInTeam;

  const managerIds = activeManagers(team).map((manager) => manager.id);
  const leavesNoManager =
    managerIds.length > 0 &&
    managerIds.every((id) =>
      staged.toRemove.some((choice) => choice.id === id),
    ) &&
    !staged.toAdd.some((choice) => choice.roleInTeam === TeamRole.MANAGER);

  const applyAll = () => {
    const joinedAt = todayISODate(timezone);

    return staged.apply([
      ...staged.toAdd.map((choice) =>
        addMember.mutateAsync({
          userId: choice.id,
          roleInTeam: choice.roleInTeam ?? TeamRole.MEMBER,
          joinedAt,
        }),
      ),
      ...staged.toRemove.map((choice) =>
        removeMember.mutateAsync(choice.membershipId!),
      ),
    ]);
  };

  const done = () => {
    if (staged.toRemove.length > 0) setIsConfirmingRemoval(true);
    else void applyAll();
  };

  return (
    <>
      <PanelView
        title={`Add members to ${team.name}`}
        description={
          <>
            Choose who is on it, then Done; choose someone again to take them
            off. <InviteHint />
          </>
        }
        pendingCount={staged.pendingCount}
        isApplying={staged.isApplying}
        onDone={done}
        onCancel={staged.cancel}
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
          selectedIds={staged.selectedIds}
          onToggle={(person) =>
            staged.toggle({ id: person.id, name: fullName(person), roleInTeam })
          }
          getId={(person) => person.id}
          getLabel={fullName}
          getSubtitle={(person) => {
            const role = joiningAs(person.id);
            return role ? `Joins as ${TEAM_ROLE_LABELS[role]}` : person.email;
          }}
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

      <ImpactDialog
        isOpen={isConfirmingRemoval}
        title={`Remove ${nameOrCount(
          staged.toRemove.map((choice) => choice.name),
          "people",
        )} from ${team.name}?`}
        description={[
          "They leave the team today.",
          leavesNoManager && leftWithoutManagerText(team),
        ]
          .filter(Boolean)
          .join(" ")}
        confirmText="Remove"
        confirmVariant="destructive"
        loading={staged.isApplying}
        onConfirm={() => {
          setIsConfirmingRemoval(false);
          void applyAll();
        }}
        onClose={() => setIsConfirmingRemoval(false)}
      />
    </>
  );
};
