"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Activity } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import { useActivitiesMutations } from "@/hooks/useActivities";
import { useActivityCategoriesInfiniteQuery } from "@/hooks/useActivityCategories";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";

import { ActivityArchiveDialog } from "./ActivityArchiveDialog";
import { ActivityForm, ActivityFormData } from "./ActivityForm";
import { ActivityRestoreDialog } from "./ActivityRestoreDialog";
import { useRouter } from "next/navigation";

import { GETTING_STARTED_PATH } from "@/lib/constants";

interface ActivityModalProps {
  open: boolean;
  onClose: () => void;
  activity?: Activity;
  isOnboarding?: boolean;
}

const FORM_ID = "activity-form";

export const ActivityModal = ({
  open,
  onClose,
  activity,
  isOnboarding = false,
}: ActivityModalProps) => {
  const router = useRouter();
  const { create, update, unarchive } = useActivitiesMutations();

  const { items: categories, isLoading: categoriesLoading } =
    useActivityCategoriesInfiniteQuery({
      status: ActCategoryStatus.ACTIVE,
    });

  const isEditMode = Boolean(activity);

  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isChoosingRestore, setIsChoosingRestore] = useState(false);
  const isArchived = activity?.status === ActivityStatus.ARCHIVED;
  const isCategoryArchived =
    activity?.category.status === ActCategoryStatus.ARCHIVED;

  const restore = () => {
    if (!activity) return;

    if (isCategoryArchived) {
      setIsChoosingRestore(true);
      return;
    }

    unarchive.mutate(activity.id, { onSuccess: onClose });
  };

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
        title={isEditMode ? activity!.name : "Create activity"}
        description={
          isEditMode
            ? "Update the activity details."
            : "Create an activity that can be assigned to projects."
        }
        icon={<ClipboardList className="size-5" />}
        footer={
          <>
            {isEditMode && (
              <Button
                type="button"
                className="mr-auto"
                variant={isArchived ? "success" : "destructive"}
                size="sm"
                onClick={() =>
                  isArchived ? restore() : setIsConfirmingArchive(true)
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
              disabled={!categoriesLoading && categories.length === 0}
            >
              {isEditMode ? "Save changes" : "Create activity"}
            </Button>
          </>
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
                    defaultBillable: activity.defaultBillable,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isOnboarding={isOnboarding}
          />
        )}
      </ResourceFormModal>

      <ActivityArchiveDialog
        activity={isConfirmingArchive && activity ? activity : null}
        onClose={() => setIsConfirmingArchive(false)}
        onArchived={onClose}
      />

      <ActivityRestoreDialog
        activity={isChoosingRestore && activity ? activity : null}
        onClose={() => setIsChoosingRestore(false)}
        onRestored={onClose}
      />
    </>
  );
};
