"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useProjectsMutations } from "@/hooks/useProjects";
import { useIsOnboarding } from "@/hooks/useSetupLink";
import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import type { ManageRowAction } from "../shared/resource/ManageList";
import { ProjectArchiveDialog } from "./ProjectArchiveDialog";
import { ProjectModal } from "./ProjectModal";

export const isActiveProject = (project: Project) =>
  project.status === ProjectStatus.ACTIVE;

/** What the viewer can do with a project, from a list row or the panel. */
export const useProjectActions = () => {
  const isOnboarding = useIsOnboarding();
  const { unarchive } = useProjectsMutations();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(
    null,
  );

  const actionsFor = (project: Project): ManageRowAction[] =>
    isActiveProject(project)
      ? [
          {
            label: "Archive",
            icon: Archive,
            destructive: true,
            onSelect: () => setArchivingProject(project),
          },
        ]
      : [
          {
            label: "Restore",
            icon: ArchiveRestore,
            onSelect: () => unarchive.mutate(project.id),
          },
        ];

  const dialogs = (
    <>
      <ProjectModal
        key={editingProject?.id ?? "edit"}
        isOnboarding={isOnboarding}
        project={editingProject ?? undefined}
        open={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
      />

      <ProjectArchiveDialog
        project={archivingProject}
        onClose={() => setArchivingProject(null)}
      />
    </>
  );

  return {
    // An archived project is read-only.
    canEdit: isActiveProject,
    edit: setEditingProject,
    actionsFor,
    dialogs,
  };
};
