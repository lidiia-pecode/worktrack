"use client";

import { useProjectsMutations } from "@/hooks/useProjects";
import { Project } from "@/types";

import { ImpactDialog } from "../shared/ImpactDialog";

interface ProjectArchiveDialogProps {
  /** The project to archive; the dialog is open while one is given. */
  project: Project | null;
  onClose: () => void;
}

export const ProjectArchiveDialog = ({
  project,
  onClose,
}: ProjectArchiveDialogProps) => {
  const { archive } = useProjectsMutations();

  const confirm = () => {
    if (!project) return;

    archive.mutate(project.id, {
      onSuccess: onClose,
    });
  };

  return (
    <ImpactDialog
      isOpen={Boolean(project)}
      title={project ? `Archive ${project.name}?` : ""}
      description="Nobody can log or plan time on it, and it can't be changed. Its people, activities and plans are kept, and restoring it brings it all back."
      confirmText="Archive"
      confirmVariant="destructive"
      onConfirm={confirm}
      onClose={onClose}
      loading={archive.isPending}
    />
  );
};
