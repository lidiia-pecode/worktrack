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
import { UserTeam } from "@/types/User";
import { TeamRole, UserRole, UserStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import { Choice, useStagedSelection } from "../entity-panel/useStagedSelection";
import { ImpactDialog } from "../shared/ImpactDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { InviteHint } from "../users/InviteHint";
import { pickerChangesCopy } from "./team-member-changes";
import { activeManagers, currentMemberships } from "./team-memberships";

export const MEMBERS_PICKER = "add-members";

const TEAM_ROLES = [TeamRole.MANAGER, TeamRole.MEMBER];

// Only someone with the Manager role can lead a team; anyone but the owner
// can be a member of one, a Manager included.
const USER_ROLES_FOR: Record<TeamRole, UserRole[]> = {
  [TeamRole.MANAGER]: [UserRole.MANAGER],
  [TeamRole.MEMBER]: [UserRole.EMPLOYEE, UserRole.MANAGER],
};

/**
 * A current member carries their membership; a new one, the role they join in
 * and, for a member of another team, the team they leave for this one.
 */
interface MemberChoice extends Choice {
  membershipId?: string;
  roleInTeam?: TeamRole;
  fromTeam?: UserTeam;
}

export const TeamMembersPicker = ({ team }: { team: Team }) => {
  const { timezone } = useWorkSettings();
  const { addMember, removeMember } = useTeamMembers(team.id);
  const [isConfirming, setIsConfirming] = useState(false);
  // A team without a manager most likely needs one first.
  const [roleInTeam, setRoleInTeam] = useState(
    activeManagers(team).length === 0 ? TeamRole.MANAGER : TeamRole.MEMBER,
  );
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useAssignableUsersInfiniteQuery({
    status: UserStatus.ACTIVE,
    roles: USER_ROLES_FOR[roleInTeam],
    search: searchQuery,
  });

  const staged = useStagedSelection<MemberChoice>(
    currentMemberships(team).map((membership) => ({
      id: membership.userId,
      name: fullName(membership.user),
      membershipId: membership.id,
    })),
  );

  const staging = (userId: string) =>
    staged.toAdd.find((choice) => choice.id === userId);

  // Only a member joins as a member; a manager leads this team on top of
  // whatever else they do.
  const leavesFor = (person: { memberTeam: UserTeam | null }) =>
    roleInTeam === TeamRole.MEMBER && person.memberTeam?.id !== team.id
      ? (person.memberTeam ?? undefined)
      : undefined;

  const moves = staged.toAdd.flatMap((choice) =>
    choice.fromTeam ? [{ name: choice.name, fromTeam: choice.fromTeam }] : [],
  );

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
          leaveCurrentTeam: Boolean(choice.fromTeam),
        }),
      ),
      ...staged.toRemove.map((choice) =>
        removeMember.mutateAsync(choice.membershipId!),
      ),
    ]);
  };

  // Taking someone off a team, or out of another one, is confirmed first.
  const done = () => {
    if (staged.toRemove.length > 0 || moves.length > 0) setIsConfirming(true);
    else void applyAll();
  };

  const confirmation = pickerChangesCopy(team, {
    moves,
    removals: staged.toRemove.map((choice) => choice.name),
    leavesNoManager,
  });

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
            staged.toggle({
              id: person.id,
              name: fullName(person),
              roleInTeam,
              fromTeam: leavesFor(person),
            })
          }
          getId={(person) => person.id}
          getLabel={fullName}
          getSubtitle={(person) => {
            const choice = staging(person.id);
            if (choice?.roleInTeam) {
              return choice.fromTeam
                ? `Joins as ${TEAM_ROLE_LABELS[choice.roleInTeam]}, leaving ${choice.fromTeam.name}`
                : `Joins as ${TEAM_ROLE_LABELS[choice.roleInTeam]}`;
            }
            // Managers show in the Member view too; unchoosing one removes them.
            if (managerIds.includes(person.id)) return "Manages this team";
            const fromTeam = leavesFor(person);
            return fromTeam ? `In ${fromTeam.name}` : person.email;
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
              : "Nobody to add yet."
          }
          searchPlaceholder="Search people..."
        />
      </PanelView>

      <ImpactDialog
        isOpen={isConfirming}
        title={confirmation.title}
        description={confirmation.description}
        confirmText={confirmation.confirmText}
        confirmVariant={confirmation.confirmVariant}
        loading={staged.isApplying}
        onConfirm={() => {
          setIsConfirming(false);
          void applyAll();
        }}
        onClose={() => setIsConfirming(false)}
      />
    </>
  );
};
