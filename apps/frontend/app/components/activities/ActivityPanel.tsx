"use client";

import { FolderTree, Plus } from "lucide-react";

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
  PanelEditForm,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { useEntityPanel } from "../entity-panel/entity-panel-context";
import { PanelList } from "../entity-panel/PanelList";
import { LoadingState } from "../shared/LoadingState";
import { ActivityForm, ActivityFormData } from "./ActivityForm";
import { PROJECTS_PICKER } from "../projects/ProjectChoicesPicker";
import { useProjectLinkChanges } from "../projects/useProjectLinkChanges";
import { ActivityProjectsPicker } from "./ActivityProjectsPicker";
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
    update.mutateAsync(
      { id: activity.id, data },
      { onSuccess: panel.stopEditing },
    );

  return (
    <PanelEditForm
      formId={EDIT_FORM_ID}
      isSaving={update.isPending}
      onCancel={panel.stopEditing}
    >
      <ActivityForm
        formId={EDIT_FORM_ID}
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
  const projectChanges = useProjectLinkChanges();

  const isActive = isActiveActivity(activity);
  // Archiving it from its row ends an open edit.
  const isEditing = panel.isEditing && activityActions.canEdit(activity);
  const canChangeProjects = isActive && !isEditing;

  if (canChangeProjects && panel.view === PROJECTS_PICKER) {
    return <ActivityProjectsPicker activity={activity} />;
  }

  return (
    <>
      <EntityPanelLayout
        type="Activity"
        name={activity.name}
        status={!isActive && <PanelStatus />}
        onEdit={
          activityActions.canEdit(activity)
            ? () => activityActions.edit(activity)
            : undefined
        }
        actions={activityActions.actionsFor(activity)}
        details={[
          {
            label: "Category",
            value: (
              <EntityLink
                entity={{ type: "category", id: activity.category.id }}
                tone="chip"
              >
                <FolderTree
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
                {activity.category.name}
              </EntityLink>
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
                Non-billable
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
                      onClick: () =>
                        projectChanges.removeActivity(project, activity),
                    }
                  : undefined,
            };
          }}
          emptyText="No project offers it yet."
          add={
            canChangeProjects
              ? {
                  label: "Add to projects",
                  icon: Plus,
                  onClick: () => panel.openView(PROJECTS_PICKER, activity.name),
                }
              : undefined
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
