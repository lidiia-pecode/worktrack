"use client";

import { useActivitiesMutations } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { Activity } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { CreateDialog, useAfterCreate } from "../shared/resource/CreateDialog";
import { ActivityForm, ActivityFormData } from "./ActivityForm";

interface ActivityCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (activity: Activity) => void;
  /** Chosen to start with, such as the category it is added from. */
  categoryId?: string;
  /** Made for a project, so it cannot be a draft. */
  requiresCategory?: boolean;
  isOnboarding?: boolean;
}

const FORM_ID = "activity-create-form";

export const ActivityCreateDialog = ({
  open,
  onClose,
  onCreated,
  categoryId,
  requiresCategory = false,
  isOnboarding = false,
}: ActivityCreateDialogProps) => {
  const { create } = useActivitiesMutations();
  const { items: categories, isLoading: categoriesLoading } =
    useActivityCategoriesAllPagesQuery(
      { status: ActCategoryStatus.ACTIVE },
      { enabled: open },
    );

  const afterCreate = useAfterCreate({ onClose, onCreated, isOnboarding });

  const handleSubmit = (data: ActivityFormData) =>
    create.mutateAsync(data, { onSuccess: afterCreate });

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      title="New activity"
      formId={FORM_ID}
      submitLabel="Create activity"
      isSubmitting={create.isPending}
      submitDisabled={
        requiresCategory && !categoriesLoading && categories.length === 0
      }
    >
      {!categoriesLoading && (
        <ActivityForm
          formId={FORM_ID}
          categories={categories}
          defaultValues={{ categoryId }}
          requiresCategory={requiresCategory}
          onSubmit={handleSubmit}
          isSubmitting={create.isPending}
          isOnboarding={isOnboarding}
        />
      )}
    </CreateDialog>
  );
};
