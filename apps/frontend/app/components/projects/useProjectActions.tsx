"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/auth/useAuth";
import { useProjectsMutations } from "@/hooks/useProjects";
import { canArchiveProjects } from "@/lib/utils/user";
import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { archiveOrRestore } from "../shared/resource/ManageList";
import { ProjectArchiveDialog } from "./ProjectArchiveDialog";

export const isActiveProject = (project: Project) =>
  project.status === ProjectStatus.ACTIVE;

/** What the viewer can do with a project, from a list row or the panel. */
export const useProjectActions = () => {
  const { user: viewer } = useAuth();
  const panel = useEntityPanel();
  const { unarchive } = useProjectsMutations();
  const [archivingProject, setArchivingProject] = useState<Project | null>(
    null,
  );

  const actionsFor = (project: Project) =>
    canArchiveProjects(viewer?.role)
      ? archiveOrRestore(isActiveProject(project), {
          archive: () => setArchivingProject(project),
          restore: () => unarchive.mutate(project.id),
        })
      : [];

  const dialogs = (
    <ProjectArchiveDialog
      project={archivingProject}
      onClose={() => setArchivingProject(null)}
    />
  );

  return {
    canEdit: isActiveProject,
    edit: (project: Project) => panel.edit({ type: "project", id: project.id }),
    actionsFor,
    dialogs,
  };
};
