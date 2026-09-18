"use client";

import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamsInfiniteQuery } from "@/hooks/useTeams";

import { hasManagerAccess } from "@/lib/utils/user";
import { Team } from "@/types/Team";

import { ResourcePage } from "../shared/resourse/ResourcePage";
import { TeamCard } from "./TeamCard";
import { TeamModal } from "./TeamModal";
import { useSearchParams } from "next/navigation";
import { TeamStatus, UserRole } from "@/types/enums";

export function TeamsContent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [status, setStatus] = useState<TeamStatus>(TeamStatus.ACTIVE);

  const { user } = useAuth();

  const {
    items: teams,
    isLoading,
    isError,
    refetch,
    pagination,
  } = useTeamsInfiniteQuery({
    status,
  });

  const searchParams = useSearchParams();

  const isOnboarding = searchParams.get("onboarding") === "true";

  const canRead = hasManagerAccess(user?.role);
  const isOwner = user?.role === UserRole.OWNER;

  const editingTeam = useMemo(
    () => teams.find((team) => team.id === editingTeamId),
    [teams, editingTeamId],
  );

  const handleTabChange = (tab: "active" | "archived") => {
    setEditingTeamId(null);
    setStatus(tab === "archived" ? TeamStatus.ARCHIVED : TeamStatus.ACTIVE);
  };

  return (
    <>
      <ResourcePage<Team>
        title="Teams"
        description="Manage teams and organize workspace members."
        items={teams}
        isLoading={isLoading}
        isError={isError || !canRead}
        onRetry={refetch}
        getSearchValue={(team) => team.name}
        searchPlaceholder="Search teams..."
        emptyTitle="No teams yet"
        emptyDescription={
          isOwner
            ? "Create your first team to organize your workspace."
            : "You do not lead any team yet. An owner adds you to one."
        }
        emptyIcon={<UsersRound className="size-6" />}
        createLabel="Create team"
        onCreate={() => setCreateOpen(true)}
        canCreate={isOwner}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        tab={status === TeamStatus.ARCHIVED ? "archived" : "active"}
        onTabChange={handleTabChange}
        renderItem={(team) => (
          <TeamCard
            key={team.id}
            team={team}
            canManage={isOwner}
            onView={(team) => setEditingTeamId(team.id)}
          />
        )}
      />

      <TeamModal
        isOnboarding={isOnboarding}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <TeamModal
        isOnboarding={isOnboarding}
        team={editingTeam}
        open={Boolean(editingTeam)}
        onClose={() => setEditingTeamId(null)}
      />
    </>
  );
}
