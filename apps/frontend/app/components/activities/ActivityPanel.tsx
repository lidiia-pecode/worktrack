"use client";

import { Badge } from "@/components/ui/badge";
import {
  useActivitiesMutations,
  useActivityDetails,
} from "@/hooks/useActivities";
import { useActivityCategoriesAllPagesQuery } from "@/hooks/useActivityCategories";
import { ActivityDetails } from "@/types";
import { ActCategoryStatus, ProjectStatus } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetails,
  PanelEditForm,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { LoadingState } from "../shared/LoadingState";
import { ActivityForm, ActivityFormData } from "./ActivityForm";
import { isActiveActivity, useActivityActions } from "./useActivityActions";

const EDIT_FORM_ID = "activity-edit-form";

const ActivityEditForm = ({ activity }: { activity: ActivityDetails }) => {
  const panel = useEntityPanel();
  const { update } = useActivitiesMutations();
  const { items: categories, isLoading } = useActivityCategoriesAllPagesQuery({
    status: ActCategoryStatus.ACTIVE,
  });

  if (isLoading) return <LoadingState size="compact" />;

  const save = (data: ActivityFormData) =>
    update.mutate({ id: activity.id, data }, { onSuccess: panel.stopEditing });

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <ActivityForm
        formId={EDIT_FORM_ID}
        mode="edit"
        categories={categories}
        defaultValues={{
          name: activity.name,
          categoryId: activity.category.id,
          defaultBillable: activity.defaultBillable,
        }}
        onSubmit={save}
        isSubmitting={update.isPending}
        onDirtyChange={panel.setHasUnsavedChanges}
      />
    </PanelEditForm>
  );
};

export const ActivityPanel = ({ id }: { id: string }) => {
  const { data: activity, isLoading, error, refetch } = useActivityDetails(id);
  const activityActions = useActivityActions();
  const panel = useEntityPanel();

  if (!activity) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  // Archiving it elsewhere, such as from its row, ends the edit.
  const isEditing = panel.isEditing && activityActions.canEdit(activity);

  return (
    <>
      <EntityPanelLayout
        name={activity.name}
        status={<PanelStatus isActive={isActiveActivity(activity)} />}
        onEdit={
          activityActions.canEdit(activity)
            ? () => activityActions.edit(activity)
            : undefined
        }
        actions={activityActions.actionsFor(activity)}
        isEditing={isEditing}
      >
        {isEditing ? (
          <ActivityEditForm activity={activity} />
        ) : (
          <PanelDetails
            details={[
              {
                label: "Category",
                value: (
                  <EntityLink
                    entity={{ type: "category", id: activity.category.id }}
                  >
                    {activity.category.name}
                  </EntityLink>
                ),
              },
              {
                label: "Billable by default",
                value: activity.defaultBillable ? "Yes" : "No",
              },
            ]}
          />
        )}

        <PanelList
          title="Projects"
          items={activity.projects ?? []}
          getKey={(project) => project.id}
          renderRow={(project) => ({
            label: (
              <EntityLink entity={{ type: "project", id: project.id }}>
                {project.name}
              </EntityLink>
            ),
            badge: project.status === ProjectStatus.ARCHIVED && (
              <Badge variant="neutral">Archived</Badge>
            ),
          })}
          emptyText="No project offers it yet."
        />
      </EntityPanelLayout>

      {activityActions.dialogs}
    </>
  );
};
