"use client";

import { Tags, Archive, ArchiveRestore } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ActivityCategory } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { useActivityCategories } from "@/hooks/useActivityCategories";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";
import {
  ActivityCategoryForm,
  ActivityCategoryFormData,
} from "./ActivityCategoryForm";
import { useRouter } from "next/navigation";

interface ActivityCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: ActivityCategory;
  isOnboarding?: boolean;
}

const FORM_ID = "activity-category-form";

export function ActivityCategoryModal({
  open,
  onClose,
  category,
  isOnboarding = false,
}: ActivityCategoryModalProps) {
  const router = useRouter();
  const {
    actions: { create, update, archive, unarchive },
  } = useActivityCategories();

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
          router.push("/");
        }
      },
    });
  };

  return (
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
        <div className="flex w-full items-center justify-between gap-3">
          {isEditMode ? (
            <Button
              type="button"
              variant={isArchived ? "success" : "destructive"}
              size="sm"
              className="gap-1.5"
              onClick={() =>
                isArchived
                  ? unarchive.mutate(category!.id, { onSuccess: onClose })
                  : archive.mutate(category!.id, { onSuccess: onClose })
              }
              isLoading={archive.isPending || unarchive.isPending}
            >
              {isArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}

              {isArchived ? "Unarchive" : "Archive"}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
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
          </div>
        </div>
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
  );
}
