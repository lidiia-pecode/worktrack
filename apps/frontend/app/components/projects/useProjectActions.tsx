"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { useProjectsMutations } from "@/hooks/useProjects";
import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import type { ManageRowAction } from "../shared/resource/ManageList";
import { ProjectArchiveDialog } from "./ProjectArchiveDialog";

export const isActiveProject = (project: Project) =>
  project.status === ProjectStatus.ACTIVE;

/** What the viewer can do with a project, from a list row or the panel. */
export const useProjectActions = () => {
  const panel = useEntityPanel();
  const { unarchive } = useProjectsMutations();
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
    <ProjectArchiveDialog
      project={archivingProject}
      onClose={() => setArchivingProject(null)}
    />
  );

  return {
    // An archived project is read-only.
    canEdit: isActiveProject,
    edit: (project: Project) => panel.edit({ type: "project", id: project.id }),
    actionsFor,
    dialogs,
  };
};
