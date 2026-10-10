"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useTeamsInfiniteQuery } from "@/hooks/useTeams";
import { MANAGER_WITHOUT_TEAM_MESSAGE } from "@/lib/constants";
import { fullName, hasManagerAccess } from "@/lib/utils/user";
import { Team, TeamUser } from "@/types/Team";
import { TeamStatus, UserRole } from "@/types/enums";

import { EntityLink, EntityLinks } from "../entity-panel/EntityLink";
import { Avatar } from "../shared/Avatar";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
  countLabel,
  ManageColumn,
  ManageCount,
  ManageList,
  ManageWarning,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import {
  activeManagers,
  currentMemberships,
  deactivatedMembersCount,
} from "./team-memberships";
import { TeamCreateDialog } from "./TeamCreateDialog";
import { isActiveTeam, useTeamActions } from "./useTeamActions";

const NO_ACTIVE_MANAGER = "No active manager";

const PeopleLinks = ({ people }: { people: TeamUser[] }) => (
  <EntityLinks
    tone="plain"
    entities={people.map((person) => ({
      entity: { type: "user", id: person.id },
      name: fullName(person),
    }))}
  />
);

// In the table, each manager with their avatar, as people appear on Users.
const ManagerList = ({ people }: { people: TeamUser[] }) => (
  <div className="flex min-w-0 flex-col gap-1">
    {people.map((person) => (
      <span key={person.id} className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className="shrink-0">
          <Avatar user={person} size="xs" />
        </span>
        <EntityLink
          entity={{ type: "user", id: person.id }}
          tone="plain"
          className="truncate"
        >
          {fullName(person)}
        </EntityLink>
      </span>
    ))}
  </div>
);

// Archiving closes every membership, so an archived team has no manager to flag.
const COLUMNS: ManageColumn<Team>[] = [
  {
    header: "Manager",
    width: "w-64",
    cell: (team) => {
      if (!isActiveTeam(team)) return "—";

      const managers = activeManagers(team);
      return managers.length > 0 ? (
        <ManagerList people={managers} />
      ) : (
        <ManageWarning>{NO_ACTIVE_MANAGER}</ManageWarning>
      );
    },
    summary: (team) => {
      if (!isActiveTeam(team)) return null;

      const managers = activeManagers(team);
      return managers.length > 0 ? (
        <>
          Managed by <PeopleLinks people={managers} />
        </>
      ) : (
        <ManageWarning inline>{NO_ACTIVE_MANAGER}</ManageWarning>
      );
    },
  },
  {
    header: "Members",
    width: "w-32",
    numeric: true,
    cell: (team) => {
      const deactivatedCount = deactivatedMembersCount(team);

      return (
        <>
          <ManageCount count={currentMemberships(team).length} />
          {deactivatedCount > 0 && (
            <span className="block text-xs text-muted-foreground">
              {deactivatedCount} deactivated
            </span>
          )}
        </>
      );
    },
    summary: (team) => {
      const members = countLabel(
        currentMemberships(team).length,
        "member",
        "members",
      );
      const deactivatedCount = deactivatedMembersCount(team);

      return deactivatedCount > 0
        ? `${members}, ${deactivatedCount} deactivated`
        : members;
    },
  },
];

export const TeamsContent = () => {
  const { isOnboarding, opensCreateForm } = useSetupLinkParams();
  const [createOpen, setCreateOpen] = useState(opensCreateForm);
  const listState = useManageListState();
  const panel = useEntityPanel();
  const teamActions = useTeamActions();
  const status =
    listState.tab === "archived" ? TeamStatus.ARCHIVED : TeamStatus.ACTIVE;

  const { user } = useAuth();

  const {
    items: teams,
    isLoading,
    isPlaceholderData,
    isError,
    refetch,
    pagination,
  } = useTeamsInfiniteQuery(
    { status, search: listState.searchQuery },
    { keepPreviousData: true },
  );

  const canRead = hasManagerAccess(user?.role);
  const isOwner = user?.role === UserRole.OWNER;

  return (
    <>
      <ResourcePage
        title="Teams"
        description="Manage teams and organize workspace members."
        listState={listState}
        itemCount={teams.length}
        isLoading={isLoading}
        isRefreshing={isPlaceholderData}
        isError={isError || !canRead}
        onRetry={refetch}
        searchPlaceholder="Search teams..."
        emptyTitle="No teams yet"
        emptyDescription={
          isOwner
            ? "Create your first team to organize your workspace."
            : MANAGER_WITHOUT_TEAM_MESSAGE
        }
        emptyIcon={<UsersRound className="size-6" />}
        createLabel="Create team"
        onCreate={() => setCreateOpen(true)}
        canCreate={isOwner}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
      >
        <ManageList
          label="Teams"
          items={teams}
          row={{
            getKey: (team) => team.id,
            getName: (team) => team.name,
            getEntity: (team) => ({ type: "team", id: team.id }),
            onEdit: teamActions.edit,
            canEdit: teamActions.canEdit,
            columns: COLUMNS,
            getActions: teamActions.actionsFor,
          }}
        />
      </ResourcePage>

      <TeamCreateDialog
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(team) => panel.open({ type: "team", id: team.id })}
      />

      {teamActions.dialogs}
    </>
  );
};
