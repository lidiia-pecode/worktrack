"use client";

import { Badge } from "@/components/ui/badge";
import { useActivityDetails } from "@/hooks/useActivities";
import { ProjectStatus } from "@/types/enums";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetails,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { isActiveActivity, useActivityActions } from "./useActivityActions";

export const ActivityPanel = ({ id }: { id: string }) => {
  const { data: activity, isLoading, error, refetch } = useActivityDetails(id);
  const activityActions = useActivityActions();

  if (!activity) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

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
      >
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
