"use client";

import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTeams } from "@/hooks/useTeams";

import { hasManagerAccess } from "@/lib/utils/user";
import { Team } from "@/types/Team";

import { ResourcePage } from "../shared/ResourcePage";
import { TeamCard } from "./TeamCard";
import { TeamModal } from "./TeamModal";

export function TeamsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const { user } = useAuth();
  const { items: teams, isLoading, isError, refetch, pagination } = useTeams();

  const canManage = hasManagerAccess(user?.role);

  const editingTeam = useMemo(
    () => teams.find((team) => team.id === editingTeamId),
    [teams, editingTeamId],
  );

  return (
    <>
      <ResourcePage<Team>
        title="Teams"
        description="Organize people into teams and manage team access."
        items={teams}
        isLoading={isLoading}
        isError={isError || !canManage}
        onRetry={refetch}
        getSearchValue={(team) => team.name}
        searchPlaceholder="Search teams..."
        emptyTitle="No teams yet"
        emptyDescription="Create your first team to start organizing people."
        emptyIcon={<UsersRound className="size-6" />}
        createLabel="Create team"
        onCreate={() => setCreateOpen(true)}
        canCreate={canManage}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        renderItem={(team) => (
          <TeamCard
            key={team.id}
            team={team}
            canManage={canManage}
            onView={(t) => setEditingTeamId(t.id)}
          />
        )}
      />

      <TeamModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <TeamModal
        team={editingTeam}
        open={Boolean(editingTeam)}
        onClose={() => setEditingTeamId(null)}
      />
    </>
  );
}
