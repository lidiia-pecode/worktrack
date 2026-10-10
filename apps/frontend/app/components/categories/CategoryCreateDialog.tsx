"use client";

import { useRouter } from "next/navigation";
import { useActivityCategoriesMutations } from "@/hooks/useActivityCategories";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { ActivityCategory } from "@/types";

import { CreateDialog } from "../shared/resource/CreateDialog";
import {
  ActivityCategoryForm,
  ActivityCategoryFormData,
} from "./ActivityCategoryForm";

interface CategoryCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Gets the new category, unless onboarding returns to the checklist instead. */
  onCreated: (category: ActivityCategory) => void;
  isOnboarding?: boolean;
}

const FORM_ID = "category-create-form";

export const CategoryCreateDialog = ({
  open,
  onClose,
  onCreated,
  isOnboarding = false,
}: CategoryCreateDialogProps) => {
  const router = useRouter();
  const { create } = useActivityCategoriesMutations();

  const handleSubmit = (data: ActivityCategoryFormData) =>
    create.mutateAsync(data, {
      onSuccess: (category) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(category);
      },
    });

  return (
    <CreateDialog
      open={open}
      onClose={onClose}
      title="New category"
      next="Next, add its activities."
      formId={FORM_ID}
      submitLabel="Create category"
      isSubmitting={create.isPending}
    >
      <ActivityCategoryForm
        formId={FORM_ID}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </CreateDialog>
  );
};
