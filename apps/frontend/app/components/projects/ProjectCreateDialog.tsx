"use client";

import { useRouter } from "next/navigation";
import { FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useClientNameSuggestions,
  useProjectsMutations,
} from "@/hooks/useProjects";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Project } from "@/types";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
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
    create.mutate(data, {
      onSuccess: (project) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(project);
      },
    });

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Create project"
      description="Name the work time goes to. You add its people and activities next."
      icon={<FolderKanban className="size-5" />}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form={FORM_ID}
            size="sm"
            isLoading={create.isPending}
          >
            Create project
          </Button>
        </>
      }
    >
      <ProjectForm
        formId={FORM_ID}
        clientSuggestions={clientSuggestions}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </ResourceFormModal>
  );
};
