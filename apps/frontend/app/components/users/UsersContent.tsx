"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useUsersInfiniteQuery } from "@/hooks/useUsers";
import { useWorkSettings } from "@/hooks/useWorkSettings";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils/date";
import {
  deactivatedOnLabel,
  fullName,
  hasManagerAccess,
} from "@/lib/utils/user";
import { UserListItem } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";
import { countLabel } from "@/lib/utils/text";

import {
  ManageColumn,
  ManageCount,
  ManageList,
  ManageWarning,
} from "../shared/resource/ManageList";
import { EntityLinks, linkedEntities } from "../entity-panel/EntityLink";
import { Avatar } from "../shared/Avatar";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { InviteUserModal } from "./InviteUserModal";
import { PendingInvitations } from "./PendingInvitations";
import { useUserActions } from "./useUserActions";

const UserTeams = ({ user }: { user: UserListItem }) => (
  <EntityLinks tone="plain" entities={linkedEntities("team", user.teams)} />
);

const NO_TEAM = "No team";

const weeklyHours = (user: UserListItem) =>
  formatDuration(user.weeklyMinutes ?? 0);

const ROLE_COLUMN: ManageColumn<UserListItem> = {
  header: "Role",
  width: "w-28",
  cell: (user) => ROLE_LABELS[user.role],
};

const TEAM_COLUMN: ManageColumn<UserListItem> = {
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
};

const PROJECTS_COLUMN: ManageColumn<UserListItem> = {
  header: "Projects",
  width: "w-24",
  numeric: true,
  cell: (user) => <ManageCount count={user.projectsCount} />,
  summary: (user) => countLabel(user.projectsCount, "project", "projects"),
};

// Only an owner reads capacity, so only an owner gets this column.
const WEEKLY_HOURS_COLUMN: ManageColumn<UserListItem> = {
  header: "Weekly hours",
  width: "w-32",
  numeric: true,
  cell: weeklyHours,
  summary: (user) => `${weeklyHours(user)} a week`,
};

// On the Deactivated tab the day they left takes the place of their projects.
const deactivatedColumn = (timeZone?: string): ManageColumn<UserListItem> => ({
  header: "Deactivated",
  width: "w-32",
  cell: (user) => deactivatedOnLabel(user, timeZone),
  summary: (user) => {
    const deactivatedOn = deactivatedOnLabel(user, timeZone);
    return deactivatedOn && `Deactivated ${deactivatedOn}`;
  },
});

export const UsersContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [inviteOpen, setInviteOpen] = useState(opensCreateForm);
  const listState = useManageListState();
  const userActions = useUserActions();
  const { user } = useAuth();
  const { timezone } = useWorkSettings();
  const canManage = hasManagerAccess(user?.role);
  const isActiveTab = listState.tab === "active";
  const status = isActiveTab ? UserStatus.ACTIVE : UserStatus.DEACTIVATED;
  const columns = [
    ROLE_COLUMN,
    TEAM_COLUMN,
    isActiveTab ? PROJECTS_COLUMN : deactivatedColumn(timezone),
    ...(user?.role === UserRole.OWNER ? [WEEKLY_HOURS_COLUMN] : []),
  ];

  const {
    items: users,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    pagination,
  } = useUsersInfiniteQuery({ status, search: listState.searchQuery });

  return (
    <>
      <ResourcePage
        title="Users"
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
            columns,
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
