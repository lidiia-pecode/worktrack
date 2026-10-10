"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useActivityCategoriesMutations,
  useActivityCategoryDetails,
} from "@/hooks/useActivityCategories";
import { useActivitiesMutations } from "@/hooks/useActivities";
import { ActivityCategoryDetails, CategoryActivity } from "@/types";
import { ActivityStatus } from "@/types/enums";

import {
  EntityPanelLayout,
  PanelEditForm,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import {
  ActivityCategoryForm,
  ActivityCategoryFormData,
} from "./ActivityCategoryForm";
import {
  ACTIVITIES_PICKER,
  CategoryActivitiesPicker,
} from "./CategoryActivitiesPicker";
import { CategoryActivityMovesDialog } from "./CategoryActivityMovesDialog";
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
  const { update } = useActivitiesMutations();
  const [removing, setRemoving] = useState<CategoryActivity | null>(null);

  if (!category) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  // Archiving it elsewhere, such as from its row, ends the edit.
  const isEditing = panel.isEditing && categoryActions.canEdit(category);
  // An archived category takes no new activities.
  const canAddActivity = isActiveCategory(category);

  if (canAddActivity && panel.view === ACTIVITIES_PICKER) {
    return <CategoryActivitiesPicker category={category} />;
  }

  return (
    <>
      <EntityPanelLayout
        type="Category"
        name={category.name}
        status={<PanelStatus isActive={isActiveCategory(category)} />}
        onEdit={
          categoryActions.canEdit(category)
            ? () => categoryActions.edit(category)
            : undefined
        }
        actions={categoryActions.actionsFor(category)}
        editForm={isEditing && <CategoryEditForm category={category} />}
        editsName
      >
        <PanelList
          title="Activities"
          items={category.activities}
          getKey={(activity) => activity.id}
          renderRow={(activity) => {
            // An archived activity is read-only, so it keeps its category.
            const isArchived = activity.status === ActivityStatus.ARCHIVED;

            return {
              entity: { type: "activity", id: activity.id },
              name: activity.name,
              isInactive: isArchived,
              status: isArchived && <Badge variant="neutral">Archived</Badge>,
              remove:
                canAddActivity && !isArchived
                  ? {
                      // On a project it can only move; the label says so before the click.
                      label: activity.isInUse
                        ? `Move ${activity.name} out of ${category.name} (it's on a project)`
                        : `Remove ${activity.name} from ${category.name}`,
                      onClick: () => !update.isPending && setRemoving(activity),
                    }
                  : undefined,
            };
          }}
          emptyText="No activities in it yet."
          action={
            canAddActivity && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => panel.openView(ACTIVITIES_PICKER, category.name)}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add activities
              </Button>
            )
          }
        />
      </EntityPanelLayout>

      {/* Taking one off a category leaves it a draft, or moves it if a project links it. */}
      <CategoryActivityMovesDialog
        category={category}
        isOpen={Boolean(removing)}
        movesOut={removing?.isInUse ? [removing] : []}
        toDrafts={removing && !removing.isInUse ? [removing] : []}
        loading={update.isPending}
        onConfirm={(destinationId) =>
          removing &&
          update.mutate(
            {
              id: removing.id,
              data: { categoryId: removing.isInUse ? destinationId : null },
            },
            { onSettled: () => setRemoving(null) },
          )
        }
        onClose={() => setRemoving(null)}
      />

      {categoryActions.dialogs}
    </>
  );
};
