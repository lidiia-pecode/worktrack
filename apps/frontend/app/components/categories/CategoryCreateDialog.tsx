"use client";

import { useRouter } from "next/navigation";
import { Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useActivityCategoriesMutations } from "@/hooks/useActivityCategories";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { ActivityCategory } from "@/types";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
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
    create.mutate(data, {
      onSuccess: (category) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(category);
      },
    });

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Create activity category"
      description="Create a category to organize your activities."
      icon={<Tags className="size-5" />}
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
            Create category
          </Button>
        </>
      }
    >
      <ActivityCategoryForm
        formId={FORM_ID}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending}
      />
    </ResourceFormModal>
  );
};
