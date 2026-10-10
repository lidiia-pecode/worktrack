"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamsMutations } from "@/hooks/useTeams";
import { Team } from "@/types/Team";
import { TeamStatus, UserRole } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import type { ManageRowAction } from "../shared/resource/ManageList";
import { TeamArchiveDialog } from "./TeamArchiveDialog";

export const isActiveTeam = (team: Team) => team.status === TeamStatus.ACTIVE;

/** What the viewer can do with a team, from a list row or the panel. */
export const useTeamActions = () => {
  const { user } = useAuth();
  const panel = useEntityPanel();
  const isOwner = user?.role === UserRole.OWNER;
  const { unarchive } = useTeamsMutations();

  const [archivingTeam, setArchivingTeam] = useState<Team | null>(null);

  // Its name is the owner's to change; an archived team is read-only. A
  // manager removes members from the panel's rows.
  const canEdit = (team: Team) => isOwner && isActiveTeam(team);

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
