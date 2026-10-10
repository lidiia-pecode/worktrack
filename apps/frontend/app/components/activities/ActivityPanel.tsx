"use client";

import { Plus, Tags } from "lucide-react";

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
  PanelEditForm,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import { LoadingState } from "../shared/LoadingState";
import { ManageWarning } from "../shared/resource/ManageList";
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
          categoryId: activity.category?.id ?? null,
          defaultBillable: activity.defaultBillable,
        }}
        // On a project it needs its category; it can only move to another.
        requiresCategory={(activity.projects?.length ?? 0) > 0}
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
  const isDraft = !activity.category;
  // Archiving it elsewhere, such as from its row, ends the edit.
  const isEditing = panel.isEditing && isActive;
  // A draft goes on no project until it has a category.
  const canChangeProjects = isActive && !isEditing && !isDraft;

  if (canChangeProjects && panel.view === PROJECTS_PICKER) {
    return (
      <>
        <ActivityProjectsPicker activity={activity} />
      </>
    );
  }

  return (
    <>
      <EntityPanelLayout
        type="Activity"
        name={activity.name}
        status={
          isActive && isDraft ? (
            <Badge variant="warning" dot>
              Draft
            </Badge>
          ) : (
            <PanelStatus isActive={isActive} />
          )
        }
        meta={
          isActive &&
          isDraft && <span>Give it a category to put it on projects.</span>
        }
        onEdit={
          activityActions.canEdit(activity)
            ? () => activityActions.edit(activity)
            : undefined
        }
        actions={activityActions.actionsFor(activity)}
        details={[
          {
            label: "Category",
            value: activity.category ? (
              <EntityLink
                entity={{ type: "category", id: activity.category.id }}
                tone="chip"
              >
                <Tags
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
                {activity.category.name}
              </EntityLink>
            ) : (
              <ManageWarning>No category</ManageWarning>
            ),
          },
          {
            label: "New time entries",
            value: activity.defaultBillable ? (
              <Badge variant="success" dot>
                Billable
              </Badge>
            ) : (
              <Badge variant="neutral" dot>
                Not billable
              </Badge>
            ),
          },
        ]}
        editForm={isEditing && <ActivityEditForm activity={activity} />}
        editsName
      >
        <PanelList
          title="Projects"
          items={activity.projects ?? []}
          getKey={(project) => project.id}
          renderRow={(project) => {
            // An archived project is read-only, so it keeps the activity.
            const isArchived = project.status === ProjectStatus.ARCHIVED;

            return {
              entity: { type: "project", id: project.id },
              name: project.name,
              isInactive: isArchived,
              status: isArchived && <Badge variant="neutral">Archived</Badge>,
              remove:
                canChangeProjects && !isArchived
                  ? {
                      label: `Remove ${activity.name} from ${project.name}`,
                      onClick: () => projectChanges.removeFromProject(project),
                    }
                  : undefined,
            };
          }}
          emptyText={
            isDraft
              ? "None yet. A project can offer it once it has a category."
              : "No project offers it yet."
          }
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
