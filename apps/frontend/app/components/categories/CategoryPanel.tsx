"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { NameForm, NameFormData } from "../shared/resource/NameForm";
import { CATEGORY_NAME_FIELD } from "./CategoryCreateDialog";
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

  const save = (data: NameFormData) =>
    update.mutate({ id: category.id, data }, { onSuccess: panel.stopEditing });

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <NameForm
        formId={EDIT_FORM_ID}
        {...CATEGORY_NAME_FIELD}
        defaultName={category.name}
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

  const isActive = isActiveCategory(category);
  // Archiving it from its row ends an open edit.
  const isEditing = panel.isEditing && isActive;

  if (isActive && panel.view === ACTIVITIES_PICKER) {
    return <CategoryActivitiesPicker category={category} />;
  }

  return (
    <>
      <EntityPanelLayout
        type="Category"
        name={category.name}
        status={<PanelStatus isActive={isActive} />}
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
                isActive && !isArchived
                  ? {
                      label: activity.isInUse
                        ? `Move ${activity.name} out of ${category.name} (it's on a project)`
                        : `Remove ${activity.name} from ${category.name}`,
                      onClick: () => {
                        if (!update.isPending) setRemoving(activity);
                      },
                    }
                  : undefined,
            };
          }}
          emptyText="No activities in it yet."
          add={
            isActive
              ? {
                  label: "Add activities",
                  icon: Plus,
                  onClick: () =>
                    panel.openView(ACTIVITIES_PICKER, category.name),
                }
              : undefined
          }
        />
      </EntityPanelLayout>

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
