"use client";

import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  PanelRemoveButton,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { LoadingState } from "../shared/LoadingState";
import { ActivityForm, ActivityFormData } from "./ActivityForm";
import {
  ActivityProjectsPicker,
  PROJECTS_PICKER,
  useActivityProjectChanges,
} from "./ActivityProjectsPicker";
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

const ActivityDetailsView = ({ activity }: { activity: ActivityDetails }) => {
  const activityActions = useActivityActions();
  const panel = useEntityPanel();
  const projectChanges = useActivityProjectChanges(activity);

  const isActive = isActiveActivity(activity);
  // Archiving it elsewhere, such as from its row, ends the edit.
  const isEditing = panel.isEditing && isActive;
  const canChangeProjects = isActive && !isEditing;

  if (isActive && panel.view === PROJECTS_PICKER) {
    return (
      <>
        <ActivityProjectsPicker activity={activity} changes={projectChanges} />
        {projectChanges.dialogs}
      </>
    );
  }

  return (
    <>
      <EntityPanelLayout
        name={activity.name}
        status={<PanelStatus isActive={isActive} />}
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
            // An archived project is read-only, so it keeps the activity.
            badge:
              project.status === ProjectStatus.ARCHIVED ? (
                <Badge variant="neutral">Archived</Badge>
              ) : (
                canChangeProjects && (
                  <PanelRemoveButton
                    label={`Remove ${activity.name} from ${project.name}`}
                    onClick={() => projectChanges.removeFromProject(project)}
                  />
                )
              ),
          })}
          emptyText="No project offers it yet."
          action={
            canChangeProjects && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => panel.openView(PROJECTS_PICKER, activity.name)}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add to projects
              </Button>
            )
          }
        />
      </EntityPanelLayout>

      {activityActions.dialogs}
      {projectChanges.dialogs}
    </>
  );
};

export const ActivityPanel = ({ id }: { id: string }) => {
  const { data: activity, isLoading, error, refetch } = useActivityDetails(id);

  if (!activity) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  return <ActivityDetailsView activity={activity} />;
};
