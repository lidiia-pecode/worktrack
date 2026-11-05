"use client";

import { useState } from "react";

import { useServerSearch } from "@/hooks/useManageListState";
import { useTeamMembers } from "@/hooks/useTeams";
import { useAssignableUsersInfiniteQuery } from "@/hooks/useUsers";
import { TEAM_ROLE_LABELS } from "@/lib/constants";
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

// Anyone but the owner can be a member, a Manager included; a team's manager
// is chosen separately.
const MEMBER_ROLES = [UserRole.EMPLOYEE, UserRole.MANAGER];

/**
 * A current member carries their membership; a new one, for someone in
 * another team, the team they leave for this one.
 */
interface MemberChoice extends Choice {
  membershipId?: string;
  fromTeam?: UserTeam;
}

export const TeamMembersPicker = ({ team }: { team: Team }) => {
  const { addMember, removeMember } = useTeamMembers(team.id);
  const [isConfirming, setIsConfirming] = useState(false);
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useAssignableUsersInfiniteQuery({
    status: UserStatus.ACTIVE,
    roles: MEMBER_ROLES,
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

  const leavesFor = ({ team: personTeam }: { team: UserTeam | null }) =>
    personTeam && personTeam.id !== team.id ? personTeam : undefined;

  const moves = staged.toAdd.flatMap((choice) =>
    choice.fromTeam ? [{ name: choice.name, fromTeam: choice.fromTeam }] : [],
  );

  const managerIds = activeManagers(team).map((manager) => manager.id);
  const leavesNoManager =
    managerIds.length > 0 &&
    managerIds.every((id) =>
      staged.toRemove.some((choice) => choice.id === id),
    );

  const applyAll = () =>
    staged.apply([
      ...staged.toAdd.map((choice) =>
        addMember.mutateAsync({
          userId: choice.id,
          leaveCurrentTeam: Boolean(choice.fromTeam),
        }),
      ),
      ...staged.toRemove.map((choice) =>
        removeMember.mutateAsync({ membershipId: choice.membershipId! }),
      ),
    ]);

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
        <EntityPicker
          items={items}
          selectedIds={staged.selectedIds}
          onToggle={(person) =>
            staged.toggle({
              id: person.id,
              name: fullName(person),
              fromTeam: leavesFor(person),
            })
          }
          getId={(person) => person.id}
          getLabel={fullName}
          getSubtitle={(person) => {
            const choice = staging(person.id);
            if (choice) {
              return choice.fromTeam
                ? `Joins as ${TEAM_ROLE_LABELS[TeamRole.MEMBER]}, leaving ${choice.fromTeam.name}`
                : `Joins as ${TEAM_ROLE_LABELS[TeamRole.MEMBER]}`;
            }
            // Unchoosing the manager removes them.
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
          emptyMessage="Nobody to add yet."
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
