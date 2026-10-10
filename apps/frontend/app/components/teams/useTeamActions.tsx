"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useTeamDetails, useTeamsMutations } from "@/hooks/useTeams";
import { useIsOnboarding } from "@/hooks/useSetupLink";
import { Team } from "@/types/Team";
import { TeamStatus, UserRole } from "@/types/enums";

import type { ManageRowAction } from "../shared/resource/ManageList";
import { TeamArchiveDialog } from "./TeamArchiveDialog";
import { TeamModal } from "./TeamModal";

export const isActiveTeam = (team: Team) => team.status === TeamStatus.ACTIVE;

/** What the viewer can do with a team, from a list row or the panel. */
export const useTeamActions = () => {
  const isOnboarding = useIsOnboarding();
  const { user } = useAuth();
  const isOwner = user?.role === UserRole.OWNER;
  const { unarchive } = useTeamsMutations();

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [archivingTeam, setArchivingTeam] = useState<Team | null>(null);
  // The form stays open while members change, so it reads the team as it is now.
  const { data: savedTeam } = useTeamDetails(editingTeam?.id ?? null);

  // A manager opens the form too, to remove someone from their team; an
  // archived team is read-only.
  const canEdit = isActiveTeam;

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

  const dialogs = (
    <>
      <TeamModal
        key={editingTeam?.id ?? "edit"}
        isOnboarding={isOnboarding}
        team={savedTeam ?? editingTeam ?? undefined}
        open={Boolean(editingTeam)}
        onClose={() => setEditingTeam(null)}
      />

      <TeamArchiveDialog
        team={archivingTeam}
        onClose={() => setArchivingTeam(null)}
      />
    </>
  );

  return { canEdit, edit: setEditingTeam, actionsFor, dialogs };
};
