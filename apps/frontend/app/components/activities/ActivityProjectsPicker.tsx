"use client";

import { useState } from "react";

import { useServerSearch } from "@/hooks/useManageListState";
import { useProjectLinks, useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { ActivityDetails } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import {
  ProjectActivityRemoval,
  RemoveProjectActivityDialog,
} from "../projects/RemoveProjectActivityDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";

export const PROJECTS_PICKER = "add-projects";

/** Puts an activity on projects or takes it off, through the project's links. */
export const useActivityProjectChanges = (activity: ActivityDetails) => {
  const links = useProjectLinks();
  const [removal, setRemoval] = useState<ProjectActivityRemoval | null>(null);

  // A second click while one change saves would act on stale details.
  const addToProject = (projectId: string) => {
    if (!links.isSaving) {
      links.addActivity.mutate({ projectId, activityId: activity.id });
    }
  };

  const removeFromProject = (project: { id: string; name: string }) => {
    if (!links.isSaving) setRemoval({ project, activity });
  };

  const dialogs = (
    <RemoveProjectActivityDialog
      removal={removal}
      onClose={() => setRemoval(null)}
    />
  );

  return { addToProject, removeFromProject, dialogs };
};

interface ActivityProjectsPickerProps {
  activity: ActivityDetails;
  changes: ReturnType<typeof useActivityProjectChanges>;
}

export const ActivityProjectsPicker = ({
  activity,
  changes,
}: ActivityProjectsPickerProps) => {
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useProjectsInfiniteQuery(
    { status: ProjectStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );
  const projectIds = (activity.projects ?? []).map((project) => project.id);

  const toggle = (projectId: string) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    if (projectIds.includes(projectId)) changes.removeFromProject(project);
    else changes.addToProject(projectId);
  };

  return (
    <PanelView
      title={`Add ${activity.name} to projects`}
      description="People on these projects can log time on it. Each choice saves at once."
    >
      <EntityPicker
        items={items}
        selectedIds={projectIds}
        onToggle={toggle}
        getId={(project) => project.id}
        getLabel={(project) => project.name}
        getSubtitle={(project) => project.clientName || "Internal"}
        onSearchChange={setSearch}
        isLoading={isLoading}
        hasNextPage={pagination.hasNextPage}
        isFetchingNextPage={pagination.isFetchingNextPage}
        onFetchNextPage={pagination.fetchNextPage}
        emptyMessage="No active projects yet."
        searchPlaceholder="Search projects..."
      />
    </PanelView>
  );
};
