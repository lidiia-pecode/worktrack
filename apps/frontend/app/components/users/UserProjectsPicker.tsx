"use client";

import { useServerSearch } from "@/hooks/useManageListState";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { useProjectLinks, useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { fullName } from "@/lib/utils/user";
import { UserDetails } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import { ImpactDialog } from "../shared/ImpactDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";

export const PROJECTS_PICKER = "add-projects";

/**
 * Puts a person on projects or takes them off, through the project's links.
 * Taking them off asks first only when it deletes their future plans there.
 */
export const useUserProjectChanges = (user: UserDetails) => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();

  // A second click while one change saves would act on stale details.
  const isBusy = links.isSaving || isChecking;

  const addToProject = (projectId: string) => {
    if (!isBusy) links.addMember.mutate({ projectId, userId: user.id });
  };

  const removeFromProject = (project: { id: string; name: string }) => {
    if (isBusy) return;

    void confirmRemoval({
      projectIds: [project.id],
      userIds: [user.id],
      title: `Remove ${fullName(user)} from ${project.name}?`,
      // A failure is reported by the global mutation handler.
      proceed: () =>
        links.removeMember
          .mutateAsync({ projectId: project.id, userId: user.id })
          .then(
            () => undefined,
            () => undefined,
          ),
    });
  };

  return {
    addToProject,
    removeFromProject,
    dialogs: <ImpactDialog {...confirmProps} />,
  };
};

interface UserProjectsPickerProps {
  user: UserDetails;
  changes: ReturnType<typeof useUserProjectChanges>;
}

export const UserProjectsPicker = ({
  user,
  changes,
}: UserProjectsPickerProps) => {
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useProjectsInfiniteQuery(
    { status: ProjectStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );
  const projectIds = user.projects.map((project) => project.id);

  const toggle = (projectId: string) => {
    const project = items.find((item) => item.id === projectId);
    if (!project) return;

    if (projectIds.includes(projectId)) changes.removeFromProject(project);
    else changes.addToProject(projectId);
  };

  return (
    <PanelView
      title={`Add ${fullName(user)} to projects`}
      description="They can log time on these projects. Each choice saves at once."
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
