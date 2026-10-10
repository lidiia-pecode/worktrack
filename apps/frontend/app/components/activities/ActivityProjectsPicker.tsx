"use client";

import { useState } from "react";

import { useServerSearch } from "@/hooks/useManageListState";
import { useProjectLinks, useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { ActivityDetails } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import {
  Choice,
  useStagedSelection,
} from "../entity-panel/use-staged-selection";
import { ProjectCreateDialog } from "../projects/ProjectCreateDialog";
import {
  ProjectActivityRemoval,
  RemoveProjectActivityDialog,
} from "../projects/RemoveProjectActivityDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";

export const PROJECTS_PICKER = "add-projects";

/** Takes an activity off one project from its row, saved at once. */
export const useActivityProjectChanges = (activity: ActivityDetails) => {
  const links = useProjectLinks();
  const [removing, setRemoving] = useState<Choice | null>(null);

  const removeFromProject = (project: Choice) => {
    if (!links.isSaving) setRemoving(project);
  };

  const dialogs = (
    <RemoveProjectActivityDialog
      removal={removing && { projects: [removing], activities: [activity] }}
      loading={links.removeActivity.isPending}
      onConfirm={() =>
        removing &&
        links.removeActivity.mutate(
          { projectId: removing.id, activityId: activity.id },
          { onSettled: () => setRemoving(null) },
        )
      }
      onClose={() => setRemoving(null)}
    />
  );

  return { removeFromProject, dialogs };
};

export const ActivityProjectsPicker = ({
  activity,
}: {
  activity: ActivityDetails;
}) => {
  const links = useProjectLinks();
  const [isCreating, setIsCreating] = useState(false);
  const [removal, setRemoval] = useState<ProjectActivityRemoval | null>(null);
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useProjectsInfiniteQuery(
    { status: ProjectStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );

  // An archived project is read-only, so it keeps the activity and is not offered.
  const staged = useStagedSelection(
    (activity.projects ?? [])
      .filter((project) => project.status === ProjectStatus.ACTIVE)
      .map(({ id, name }) => ({ id, name })),
  );

  const toggle = (projectId: string) => {
    const project = items.find((item) => item.id === projectId);
    if (project) staged.toggle({ id: project.id, name: project.name });
  };

  const applyAll = () =>
    staged.apply([
      ...staged.toAdd.map((project) =>
        links.addActivity.mutateAsync({
          projectId: project.id,
          activityId: activity.id,
        }),
      ),
      ...staged.toRemove.map((project) =>
        links.removeActivity.mutateAsync({
          projectId: project.id,
          activityId: activity.id,
        }),
      ),
    ]);

  const done = () => {
    if (staged.toRemove.length > 0) {
      setRemoval({ projects: staged.toRemove, activities: [activity] });
      return;
    }

    void applyAll();
  };

  return (
    <>
      <PanelView
        title={`Add ${activity.name} to projects`}
        description="People on these projects can log time on it. Choose them, then Done; choose one again to take it off."
        create={{ label: "New project", onClick: () => setIsCreating(true) }}
        pendingCount={staged.pendingCount}
        isApplying={staged.isApplying}
        onDone={done}
        onCancel={staged.cancel}
      >
        <EntityPicker
          items={items}
          selectedIds={staged.selectedIds}
          onToggle={toggle}
          getId={(project) => project.id}
          getLabel={(project) => project.name}
          getSubtitle={(project) => project.clientName || "Internal"}
          onSearchChange={setSearch}
          isLoading={isLoading}
          hasNextPage={pagination.hasNextPage}
          isFetchingNextPage={pagination.isFetchingNextPage}
          onFetchNextPage={pagination.fetchNextPage}
          emptyMessage="No active projects yet. Make the first with New project."
          searchPlaceholder="Search projects..."
        />
      </PanelView>

      {/* A new project joins the choices, applied with them on Done. */}
      <ProjectCreateDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={(project) =>
          staged.select({ id: project.id, name: project.name })
        }
      />

      <RemoveProjectActivityDialog
        removal={removal}
        loading={staged.isApplying}
        onConfirm={() => {
          setRemoval(null);
          void applyAll();
        }}
        onClose={() => setRemoval(null)}
      />
    </>
  );
};
