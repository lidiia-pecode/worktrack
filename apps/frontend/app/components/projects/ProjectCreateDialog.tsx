"use client";

import {
  useClientNameSuggestions,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { Project } from "@/types";

import { CreateDialog, useAfterCreate } from "../shared/resource/CreateDialog";
import { ProjectForm, ProjectFormData } from "./ProjectForm";

interface ProjectCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
  isOnboarding?: boolean;
}

const FORM_ID = "project-create-form";

export const ProjectCreateDialog = ({
  open,
  onClose,
  onCreated,
  isOnboarding,
}: ProjectCreateDialogProps) => {
  const { create } = useProjectsMutations();
  const clientSuggestions = useClientNameSuggestions();
  const afterCreate = useAfterCreate({ onClose, onCreated, isOnboarding });

  const handleSubmit = (data: ProjectFormData) =>
    create.mutateAsync(data, { onSuccess: afterCreate });

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      title="New project"
      next="Next, add its people and activities."
      formId={FORM_ID}
      submitLabel="Create project"
      isSubmitting={create.isPending}
    >
      <ProjectForm
        formId={FORM_ID}
        clientSuggestions={clientSuggestions}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </CreateDialog>
  );
};
