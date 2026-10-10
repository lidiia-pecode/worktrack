"use client";

import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useActivitiesMutations } from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { GETTING_STARTED_PATH } from "@/lib/constants";
import { Activity } from "@/types";
import { ActCategoryStatus } from "@/types/enums";

import { ResourceFormModal } from "../shared/resource/ResourceFormModal";
import { ActivityForm, ActivityFormData } from "./ActivityForm";

interface ActivityCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Gets the new activity, unless onboarding returns to the checklist instead. */
  onCreated: (activity: Activity) => void;
  /** Where the new activity starts, such as the category it is added from. */
  categoryId?: string;
  isOnboarding?: boolean;
}

const FORM_ID = "activity-create-form";

export const ActivityCreateDialog = ({
  open,
  onClose,
  onCreated,
  categoryId,
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
    create.mutate(data, {
      onSuccess: (activity) => {
        onClose();

        if (isOnboarding) router.push(GETTING_STARTED_PATH);
        else onCreated(activity);
      },
    });

  return (
    <ResourceFormModal
      open={open}
      onClose={onClose}
      title="Create activity"
      description="Create an activity that can be assigned to projects."
      icon={<ClipboardList className="size-5" />}
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
            disabled={!categoriesLoading && categories.length === 0}
          >
            Create activity
          </Button>
        </>
      }
    >
      {!categoriesLoading && (
        <ActivityForm
          formId={FORM_ID}
          categories={categories}
          defaultValues={{ categoryId }}
          onSubmit={handleSubmit}
          isSubmitting={create.isPending}
          isOnboarding={isOnboarding}
        />
      )}
    </ResourceFormModal>
  );
};
