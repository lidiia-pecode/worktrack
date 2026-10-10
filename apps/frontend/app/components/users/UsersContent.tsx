"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useUsersInfiniteQuery } from "@/hooks/useUsers";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/date";
import { fullName, hasManagerAccess } from "@/lib/utils/user";
import { UserListItem } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";

import {
  countLabel,
  ManageColumn,
  ManageCount,
  ManageList,
  ManageWarning,
} from "../shared/resource/ManageList";
import { EntityLinks } from "../entity-panel/EntityLink";
import { Avatar } from "../shared/Avatar";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { InviteUserModal } from "./InviteUserModal";
import { PendingInvitations } from "./PendingInvitations";
import { useUserActions } from "./useUserActions";

const UserTeams = ({ user }: { user: UserListItem }) => (
  <EntityLinks
    tone="plain"
    entities={user.teams.map((team) => ({
      entity: { type: "team", id: team.id },
      name: team.name,
    }))}
  />
);

const NO_TEAM = "No team";

const weeklyHours = (user: UserListItem) =>
  formatDuration(user.weeklyMinutes ?? 0);

const COLUMNS: ManageColumn<UserListItem>[] = [
  { header: "Role", width: "w-28", cell: (user) => ROLE_LABELS[user.role] },
  {
    header: "Team",
    width: "w-48",
    cell: (user) =>
      user.teams.length > 0 ? (
        <UserTeams user={user} />
      ) : (
        <ManageWarning>{NO_TEAM}</ManageWarning>
      ),
    summary: (user) =>
      user.teams.length > 0 ? (
        <UserTeams user={user} />
      ) : (
        <ManageWarning inline>{NO_TEAM}</ManageWarning>
      ),
  },
  {
    header: "Projects",
    width: "w-24",
    numeric: true,
    cell: (user) => <ManageCount count={user.projectsCount} />,
    summary: (user) => countLabel(user.projectsCount, "project", "projects"),
  },
];

// Only an owner reads capacity, so only an owner gets this column.
const OWNER_COLUMNS: ManageColumn<UserListItem>[] = [
  ...COLUMNS,
  {
    header: "Weekly hours",
    width: "w-32",
    numeric: true,
    cell: weeklyHours,
    summary: (user) => `${weeklyHours(user)} a week`,
  },
];

export const UsersContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [inviteOpen, setInviteOpen] = useState(opensCreateForm);
  const listState = useManageListState();
  const userActions = useUserActions();
  const { user } = useAuth();
  const canManage = hasManagerAccess(user?.role);
  const isActiveTab = listState.tab === "active";
  const status = isActiveTab ? UserStatus.ACTIVE : UserStatus.DEACTIVATED;

  const {
    items: users,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    pagination,
  } = useUsersInfiniteQuery(
    { status, search: listState.searchQuery },
    { keepPreviousData: true },
  );

  return (
    <>
      <ResourcePage
        title="Users"
        description="Manage workspace users, roles and project access."
        listState={listState}
        itemCount={users.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canManage}
        onRetry={refetch}
        searchPlaceholder="Search users..."
        emptyTitle="No users yet"
        emptyDescription="Invite your first user to start building your workspace."
        emptyIcon={<UsersRound className="size-6" />}
        createLabel="Invite user"
        onCreate={() => setInviteOpen(true)}
        canCreate={canManage && isActiveTab}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        archivedLabel="Deactivated"
        archiveVerb="deactivate"
        topContent={canManage && isActiveTab && <PendingInvitations />}
      >
        <ManageList
          label="Users"
          items={users}
          row={{
            getKey: (listed) => listed.id,
            getName: fullName,
            getDetail: (listed) => listed.email,
            getLeading: (listed) => <Avatar user={listed} />,
            getEntity: (listed) => ({ type: "user", id: listed.id }),
            onEdit: userActions.edit,
            canEdit: userActions.canEdit,
            columns: user?.role === UserRole.OWNER ? OWNER_COLUMNS : COLUMNS,
            getActions: userActions.actionsFor,
          }}
        />
      </ResourcePage>

      {userActions.dialogs}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        isOnboarding={isOnboarding}
      />
    </>
  );
};
