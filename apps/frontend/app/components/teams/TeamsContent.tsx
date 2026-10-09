"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useManageListState } from "@/hooks/useManageListState";
import { useSetupLinkParams } from "@/hooks/useSetupLink";
import { useTeamsInfiniteQuery, useTeamsMutations } from "@/hooks/useTeams";
import { MANAGER_WITHOUT_TEAM_MESSAGE } from "@/lib/constants";
import {
  fullName,
  hasManagerAccess,
  isDeactivatedUser,
} from "@/lib/utils/user";
import { Team, TeamMembership, TeamUser } from "@/types/Team";
import { TeamRole, TeamStatus, UserRole } from "@/types/enums";

import {
  countLabel,
  ManageColumn,
  ManageList,
  ManageRowAction,
  ManageWarning,
} from "../shared/resource/ManageList";
import { ResourcePage } from "../shared/resource/ResourcePage";
import { TeamArchiveDialog } from "./TeamArchiveDialog";
import { TeamModal } from "./TeamModal";

type CurrentMembership = TeamMembership & { user: TeamUser };

const currentMemberships = (team: Team): CurrentMembership[] =>
  (team.memberships ?? []).filter(
    (membership): membership is CurrentMembership =>
      !membership.leftAt && Boolean(membership.user),
  );

const isActiveTeam = (team: Team) => team.status === TeamStatus.ACTIVE;

const activeManagerNames = (team: Team) =>
  currentMemberships(team)
    .filter(
      (membership) =>
        membership.roleInTeam === TeamRole.MANAGER &&
        !isDeactivatedUser(membership.user),
    )
    .map((membership) => fullName(membership.user));

const deactivatedMembersCount = (team: Team) =>
  currentMemberships(team).filter((membership) =>
    isDeactivatedUser(membership.user),
  ).length;

const NO_ACTIVE_MANAGER = "No active manager";

// Archiving closes every membership, so an archived team has no manager to flag.
const COLUMNS: ManageColumn<Team>[] = [
  {
    header: "Manager",
    width: "w-64",
    cell: (team) => {
      if (!isActiveTeam(team)) return "—";

      const names = activeManagerNames(team);
      return names.length > 0 ? (
        names.join(", ")
      ) : (
        <ManageWarning>{NO_ACTIVE_MANAGER}</ManageWarning>
      );
    },
    summary: (team) => {
      if (!isActiveTeam(team)) return null;

      const names = activeManagerNames(team);
      return names.length > 0 ? (
        `Managed by ${names.join(", ")}`
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
          {currentMemberships(team).length}
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
  const [openedTeamId, setOpenedTeamId] = useState<string | null>(null);
  const [archivingTeam, setArchivingTeam] = useState<Team | null>(null);
  const listState = useManageListState();
  const status =
    listState.tab === "archived" ? TeamStatus.ARCHIVED : TeamStatus.ACTIVE;

  const { user } = useAuth();
  const { unarchive } = useTeamsMutations();

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

  const openedTeam = teams.find((team) => team.id === openedTeamId);

  // Archiving and restoring a team are the owner's.
  const actionsFor = (team: Team): ManageRowAction[] => {
    if (!isOwner) return [];

    return isActiveTeam(team)
      ? [
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => setArchivingTeam(team),
          },
        ]
      : [
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => unarchive.mutate(team.id),
          },
        ];
  };

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
            onOpen: (team) => setOpenedTeamId(team.id),
            canEdit: (team) => isOwner && isActiveTeam(team),
            columns: COLUMNS,
            getActions: actionsFor,
          }}
        />
      </ResourcePage>

      <TeamModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <TeamModal
        key={openedTeam?.id ?? "edit"}
        isOnboarding={isOnboarding}
        team={openedTeam}
        open={Boolean(openedTeam)}
        onClose={() => setOpenedTeamId(null)}
      />

      <TeamArchiveDialog
        team={archivingTeam}
        onClose={() => setArchivingTeam(null)}
      />
    </>
  );
};
