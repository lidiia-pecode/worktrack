"use client";

import { useRouter } from "next/navigation";
import { useActivitiesMutations } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Activity } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { CreateDialog } from "../shared/resource/CreateDialog";
import { ActivityForm, ActivityFormData } from "./ActivityForm";

interface ActivityCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Gets the new activity, unless onboarding returns to the checklist instead. */
  onCreated: (activity: Activity) => void;
  /** Where the new activity starts, such as the category it is added from. */
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
  const router = useRouter();
  const { create } = useActivitiesMutations();
  const { items: categories, isLoading: categoriesLoading } =
    useActivityCategoriesAllPagesQuery(
      { status: ActCategoryStatus.ACTIVE },
      { enabled: open },
    );

  const handleSubmit = (data: ActivityFormData) =>
    create.mutateAsync(data, {
      onSuccess: (activity) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(activity);
      },
    });

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
