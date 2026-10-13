"use client";

import { useActivityCategoriesMutations } from "@/hooks/useActivityCategories";
import { ActivityCategory } from "@/types";

import { CreateDialog, useAfterCreate } from "../shared/resource/CreateDialog";
import { NameForm, NameFormData } from "../shared/resource/NameForm";

interface CategoryCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (category: ActivityCategory) => void;
  isOnboarding?: boolean;
}

const FORM_ID = "category-create-form";

/** The same name field on creating and in the panel. */
export const CATEGORY_NAME_FIELD = {
  entity: "Category",
  maxLength: 100,
  placeholder: "e.g. Development",
};

export const CategoryCreateDialog = ({
  open,
  onClose,
  onCreated,
  isOnboarding,
}: CategoryCreateDialogProps) => {
  const { create } = useActivityCategoriesMutations();
  const afterCreate = useAfterCreate({ onClose, onCreated, isOnboarding });

  const handleSubmit = (data: NameFormData) =>
    create.mutateAsync(data, { onSuccess: afterCreate });

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
      <NameForm
        formId={FORM_ID}
        {...CATEGORY_NAME_FIELD}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </CreateDialog>
  );
};
