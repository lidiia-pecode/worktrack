"use client";

import { Archive, ArchiveRestore, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Activity } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import { useActivities } from "@/hooks/useActivities";
import { useActivityCategoriesInfiniteQuery } from "@/hooks/useActivityCategories";

import { ResourceFormModal } from "../shared/resourse/ResourceFormModal";

import { ActivityForm, ActivityFormData } from "./ActivityForm";
import { useRouter } from "next/navigation";

interface ActivityModalProps {
  open: boolean;
  onClose: () => void;
  activity?: Activity;
  isOnboarding?: boolean;
}

const FORM_ID = "activity-form";

export function ActivityModal({
  open,
  onClose,
  activity,
  isOnboarding = false,
}: ActivityModalProps) {
  const router = useRouter();
  const {
    actions: { create, update, archive, unarchive },
  } = useActivities();

  const { items: categories, isLoading: categoriesLoading } =
    useActivityCategoriesInfiniteQuery({
      status: ActCategoryStatus.ACTIVE,
    });

  const isEditMode = Boolean(activity);

  const isArchived = activity?.status === ActivityStatus.ARCHIVED;

  const isSubmitting = create.isPending || update.isPending;

  const handleSubmit = (data: ActivityFormData) => {
    if (activity) {
      update.mutate(
        {
          id: activity.id,
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
      title={isEditMode ? activity!.name : "Create activity"}
      description={
        isEditMode
          ? "Update the activity details."
          : "Create an activity that can be assigned to projects."
      }
      icon={<ClipboardList className="size-5" />}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {isEditMode ? (
            <Button
              type="button"
              variant={isArchived ? "success" : "destructive"}
              size="sm"
              onClick={() =>
                isArchived
                  ? unarchive.mutate(activity.id)
                  : archive.mutate(activity!.id)
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
              {isEditMode ? "Save changes" : "Create activity"}
            </Button>
          </div>
        </div>
      }
    >
      {!categoriesLoading && (
        <ActivityForm
          formId={FORM_ID}
          mode={isEditMode ? "edit" : "create"}
          categories={categories}
          defaultValues={
            activity
              ? {
                  name: activity.name,
                  categoryId: activity.category.id,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </ResourceFormModal>
  );
}
