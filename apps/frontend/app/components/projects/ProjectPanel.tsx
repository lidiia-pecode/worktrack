"use client";

import { Badge } from "@/components/ui/badge";
import { useProjectDetails } from "@/hooks/useProjects";
import { fullName, isDeactivatedUser } from "@/lib/utils/user";
import { Activity } from "@/types";

import { EntityLink } from "../entity-panel/EntityLink";
import {
  EntityPanelLayout,
  PanelDetails,
  PanelList,
  PanelQueryState,
  PanelStatus,
} from "../entity-panel/EntityPanelLayout";
import { isActiveProject, useProjectActions } from "./useProjectActions";

// A manager reads only their own people on a project, while the count is the
// project's true size, so the difference is who they cannot see.
const hiddenMembersNote = (hiddenCount: number) =>
  hiddenCount > 0
    ? `${hiddenCount} more ${hiddenCount === 1 ? "person" : "people"} in teams you do not manage.`
    : undefined;

export const ProjectPanel = ({ id }: { id: string }) => {
  const { data: project, isLoading, error, refetch } = useProjectDetails(id);
  const projectActions = useProjectActions();

  if (!project) {
    return (
      <PanelQueryState isLoading={isLoading} error={error} onRetry={refetch} />
    );
  }

  const members = project.users ?? [];
  const hiddenCount = Math.max((project.membersCount ?? 0) - members.length, 0);
  const activities = (project.projectActivities ?? [])
    .map((projectActivity) => projectActivity.activity)
    .filter((activity): activity is Activity => Boolean(activity));

  return (
    <>
      <EntityPanelLayout
        name={project.name}
        status={<PanelStatus isActive={isActiveProject(project)} />}
        onEdit={
          projectActions.canEdit(project)
            ? () => projectActions.edit(project)
            : undefined
        }
        actions={projectActions.actionsFor(project)}
      >
        <PanelDetails
          details={[
            { label: "Client", value: project.clientName || "Internal" },
            {
              label: "Description",
              value: project.description || "No description",
            },
          ]}
        />

        <PanelList
          title="People"
          items={members}
          getKey={(member) => member.id}
          note={hiddenMembersNote(hiddenCount)}
          renderRow={(member) => ({
            label: (
              <EntityLink entity={{ type: "user", id: member.id }}>
                {fullName(member)}
              </EntityLink>
            ),
            detail: member.position,
            badge: isDeactivatedUser(member) && (
              <Badge variant="neutral">Deactivated</Badge>
            ),
          })}
          emptyText={
            hiddenCount > 0
              ? "Nobody from your teams is on it."
              : "Nobody is on this project yet."
          }
        />

        <PanelList
          title="Activities"
          items={activities}
          getKey={(activity) => activity.id}
          renderRow={(activity) => ({
            label: (
              <EntityLink entity={{ type: "activity", id: activity.id }}>
                {activity.name}
              </EntityLink>
            ),
            detail: activity.category && (
              <EntityLink
                entity={{ type: "category", id: activity.category.id }}
              >
                {activity.category.name}
              </EntityLink>
            ),
          })}
          emptyText="No activities yet, so nobody can log time on it."
        />
      </EntityPanelLayout>

      {projectActions.dialogs}
    </>
  );
};
