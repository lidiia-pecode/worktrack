"use client";

import { useState } from "react";
import { Tags, Archive, ArchiveRestore } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ActivityCategory } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { useActivityCategories } from "@/hooks/useActivityCategories";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
import { CategoryArchiveDialog } from "./CategoryArchiveDialog";
import {
  ActivityCategoryForm,
  ActivityCategoryFormData,
} from "./ActivityCategoryForm";
import { useRouter } from "next/navigation";

import { GETTING_STARTED_PATH } from "@/lib/constants";

interface ActivityCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: ActivityCategory;
  isOnboarding?: boolean;
}

const FORM_ID = "activity-category-form";

export const ActivityCategoryModal = ({
  open,
  onClose,
  category,
  isOnboarding = false,
}: ActivityCategoryModalProps) => {
  const router = useRouter();
  const {
    actions: { create, update, unarchive },
  } = useActivityCategories();

  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);

  const isEditMode = Boolean(category);
  const isArchived = category?.status === ActCategoryStatus.ARCHIVED;

  const isSubmitting = create.isPending || update.isPending;

  const handleSubmit = (data: ActivityCategoryFormData) => {
    if (category) {
      update.mutate(
        {
          id: category.id,
          data,
        },
        {
          onSuccess: onClose,
        },
      );

      return;
    }

    create.mutate(data, {
      onSuccess: () => {
        onClose();

        if (isOnboarding) {
          router.push(GETTING_STARTED_PATH);
        }
      },
    });
  };

  return (
    <>
      <ResourceFormModal
        open={open}
        onClose={onClose}
        title={isEditMode ? category!.name : "Create activity category"}
        description={
          isEditMode
            ? "Update the activity category details."
            : "Create a category to organize your activities."
        }
        icon={<Tags className="size-5" />}
        footer={
          <>
            {isEditMode && (
              <Button
                type="button"
                variant={isArchived ? "success" : "destructive"}
                size="sm"
                className="mr-auto gap-1.5"
                onClick={() =>
                  isArchived
                    ? unarchive.mutate(category!.id, { onSuccess: onClose })
                    : setIsConfirmingArchive(true)
                }
                isLoading={unarchive.isPending}
              >
                {isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}

                {isArchived ? "Restore" : "Archive"}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form={FORM_ID}
              size="sm"
              isLoading={isSubmitting}
            >
              {isEditMode ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <ActivityCategoryForm
          formId={FORM_ID}
          mode={isEditMode ? "edit" : "create"}
          defaultValues={
            category
              ? {
                  name: category.name,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </ResourceFormModal>

      {category && (
        <CategoryArchiveDialog
          isOpen={isConfirmingArchive}
          category={category}
          onClose={() => setIsConfirmingArchive(false)}
          onArchived={() => {
            setIsConfirmingArchive(false);
            onClose();
          }}
        />
      )}
    </>
  );
};
