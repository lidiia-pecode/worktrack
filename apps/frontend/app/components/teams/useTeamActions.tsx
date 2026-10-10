"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamsMutations } from "@/hooks/useTeams";
import { Team } from "@/types/Team";
import { TeamStatus, UserRole } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { archiveOrRestore } from "../shared/resource/ManageList";
import { TeamArchiveDialog } from "./TeamArchiveDialog";

export const isActiveTeam = (team: Team) => team.status === TeamStatus.ACTIVE;

/** What the viewer can do with a team, from a list row or the panel. */
export const useTeamActions = () => {
  const { user } = useAuth();
  const panel = useEntityPanel();
  const isOwner = user?.role === UserRole.OWNER;
  const { unarchive } = useTeamsMutations();

  const [archivingTeam, setArchivingTeam] = useState<Team | null>(null);

  // Only the owner renames a team, and only an active one.
  const canEdit = (team: Team) => isOwner && isActiveTeam(team);

  const actionsFor = (team: Team) =>
    isOwner
      ? archiveOrRestore(isActiveTeam(team), {
          archive: () => setArchivingTeam(team),
          restore: () => unarchive.mutate(team.id),
        })
      : [];

  const dialogs = (
    <TeamArchiveDialog
      team={archivingTeam}
      onClose={() => setArchivingTeam(null)}
    />
  );

  return {
    canEdit,
    edit: (team: Team) => panel.edit({ type: "team", id: team.id }),
    actionsFor,
    dialogs,
  };
};
