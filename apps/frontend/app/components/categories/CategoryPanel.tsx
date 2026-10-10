"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useActivityCategoriesMutations,
  useActivityCategoryDetails,
} from "@/hooks/useActivityCategories";
import { ActivityCategoryDetails } from "@/types";
import { ActivityStatus } from "@/types/enums";

import { ActivityCreateDialog } from "../activities/ActivityCreateDialog";
import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelEditForm,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import {
  ActivityCategoryForm,
  ActivityCategoryFormData,
} from "./ActivityCategoryForm";
import { isActiveCategory, useCategoryActions } from "./useCategoryActions";

const EDIT_FORM_ID = "category-edit-form";

const CategoryEditForm = ({
  category,
}: {
  category: ActivityCategoryDetails;
}) => {
  const panel = useEntityPanel();
  const { update } = useActivityCategoriesMutations();

  const save = (data: ActivityCategoryFormData) =>
    update.mutate({ id: category.id, data }, { onSuccess: panel.stopEditing });

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <ActivityCategoryForm
        formId={EDIT_FORM_ID}
        mode="edit"
        defaultValues={{ name: category.name }}
        onSubmit={save}
        isSubmitting={update.isPending}
        onDirtyChange={panel.setHasUnsavedChanges}
      />
    </PanelEditForm>
  );
};

export const CategoryPanel = ({ id }: { id: string }) => {
  const {
    data: category,
    isLoading,
    error,
    refetch,
  } = useActivityCategoryDetails(id);
  const categoryActions = useCategoryActions();
  const panel = useEntityPanel();
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  if (!category) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  // Archiving it elsewhere, such as from its row, ends the edit.
  const isEditing = panel.isEditing && categoryActions.canEdit(category);
  // An archived category takes no new activities.
  const canAddActivity = isActiveCategory(category) && !isEditing;

  return (
    <>
      <EntityPanelLayout
        name={category.name}
        status={<PanelStatus isActive={isActiveCategory(category)} />}
        onEdit={
          categoryActions.canEdit(category)
            ? () => categoryActions.edit(category)
            : undefined
        }
        actions={categoryActions.actionsFor(category)}
        isEditing={isEditing}
      >
        {isEditing && <CategoryEditForm category={category} />}

        <PanelList
          title="Activities"
          items={category.activities}
          getKey={(activity) => activity.id}
          renderRow={(activity) => ({
            label: (
              <EntityLink entity={{ type: "activity", id: activity.id }}>
                {activity.name}
              </EntityLink>
            ),
            badge: activity.status === ActivityStatus.ARCHIVED && (
              <Badge variant="neutral">Archived</Badge>
            ),
          })}
          emptyText="No activities in it yet."
          action={
            canAddActivity && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingActivity(true)}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add activity
              </Button>
            )
          }
        />
      </EntityPanelLayout>

      <ActivityCreateDialog
        open={isAddingActivity}
        onClose={() => setIsAddingActivity(false)}
        categoryId={category.id}
        onCreated={(activity) =>
          panel.follow({ type: "activity", id: activity.id }, category.name)
        }
      />

      {categoryActions.dialogs}
    </>
  );
};
