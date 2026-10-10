"use client";

import { useRouter } from "next/navigation";
import {
  useClientNameSuggestions,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Project } from "@/types";

import { CreateDialog } from "../shared/resource/CreateDialog";
import { ProjectForm, ProjectFormData } from "./ProjectForm";

interface ProjectCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Gets the new project, unless onboarding returns to the checklist instead. */
  onCreated: (project: Project) => void;
  isOnboarding?: boolean;
}

const FORM_ID = "project-create-form";

/** People and activities are added in the new project's panel. */
export const ProjectCreateDialog = ({
  open,
  onClose,
  onCreated,
  isOnboarding = false,
}: ProjectCreateDialogProps) => {
  const router = useRouter();
  const { create } = useProjectsMutations();
  const clientSuggestions = useClientNameSuggestions();

  const handleSubmit = (data: ProjectFormData) =>
    create.mutateAsync(data, {
      onSuccess: (project) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(project);
      },
    });

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
