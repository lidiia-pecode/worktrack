"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Activity } from "@/types";
import { ActCategoryStatus, ActivityStatus } from "@/types/enums";

import { useActivities, useActivityArchiveImpact } from "@/hooks/useActivities";
import { useActivityCategoriesInfiniteQuery } from "@/hooks/useActivityCategories";

import { ConfirmModal } from "../shared/ConfirmModal";
import { ResourceFormModal } from "../shared/resource/ResourceFormModal";

import { ActivityForm, ActivityFormData } from "./ActivityForm";
import { ActivityRestoreDialog } from "./ActivityRestoreDialog";
import { archiveImpactMessage } from "./archive-impact";
import { useRouter } from "next/navigation";

import { GETTING_STARTED_PATH } from "@/lib/constants";

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

  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isChoosingRestore, setIsChoosingRestore] = useState(false);
  const archiveImpact = useActivityArchiveImpact(
    activity?.id ?? "",
    isConfirmingArchive,
  );

  const confirmArchive = () => {
    if (!activity || !archiveImpact.data) return;

    archive.mutate(activity.id, {
      onSuccess: () => {
        setIsConfirmingArchive(false);
        onClose();
      },
    });
  };

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
          <div className="flex w-full items-center justify-between gap-3">
            {isEditMode ? (
              <Button
                type="button"
                variant={isArchived ? "success" : "destructive"}
                size="sm"
                onClick={() =>
                  isArchived ? restore() : setIsConfirmingArchive(true)
                }
                isLoading={archive.isPending || unarchive.isPending}
              >
                {isArchived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}

                {isArchived ? "Restore" : "Archive"}
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
                disabled={!categoriesLoading && categories.length === 0}
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

      <ConfirmModal
        isOpen={isConfirmingArchive}
        title={activity ? `Archive ${activity.name}?` : ""}
        message={
          archiveImpact.isError
            ? "Could not check which projects use it. Close this and try again."
            : archiveImpactMessage(archiveImpact.data)
        }
        confirmText="Archive"
        variant="danger"
        onConfirm={confirmArchive}
        onClose={() => setIsConfirmingArchive(false)}
        loading={archive.isPending}
        confirmDisabled={!archiveImpact.data}
      />

      {activity && isCategoryArchived && (
        <ActivityRestoreDialog
          isOpen={isChoosingRestore}
          activity={activity}
          onClose={() => setIsChoosingRestore(false)}
          onRestored={() => {
            setIsChoosingRestore(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
