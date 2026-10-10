"use client";

import { useState } from "react";

import { useServerSearch } from "@/hooks/useManageListState";
import { usePlanningRemovalGuard } from "@/hooks/usePlanningRemovalGuard";
import { useProjectLinks, useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { fullName } from "@/lib/utils/user";
import { UserDetails } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import {
  Choice,
  useStagedSelection,
} from "../entity-panel/use-staged-selection";
import { ProjectCreateDialog } from "../projects/ProjectCreateDialog";
import { ImpactDialog } from "../shared/ImpactDialog";
import { EntityPicker } from "../shared/resource/EntityPicker";

export const PROJECTS_PICKER = "add-projects";

/**
 * Takes a person off one project from its row, saved at once; it asks first
 * only when that deletes their future plans there.
 */
export const useUserProjectChanges = (user: UserDetails) => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();

  const removeFromProject = (project: Choice) => {
    // A second click while one change saves would act on stale details.
    if (links.isSaving || isChecking) return;

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
    removeFromProject,
    dialogs: <ImpactDialog {...confirmProps} />,
  };
};

const projectCount = (count: number) =>
  `${count} ${count === 1 ? "project" : "projects"}`;

export const UserProjectsPicker = ({ user }: { user: UserDetails }) => {
  const links = useProjectLinks();
  const { confirmRemoval, isChecking, confirmProps } =
    usePlanningRemovalGuard();
  const [isCreating, setIsCreating] = useState(false);
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useProjectsInfiniteQuery(
    { status: ProjectStatus.ACTIVE, search: searchQuery },
    { keepPreviousData: true },
  );

  // An archived project is read-only, so it keeps them and is not offered.
  const staged = useStagedSelection(
    user.projects
      .filter((project) => project.status === ProjectStatus.ACTIVE)
      .map(({ id, name }) => ({ id, name })),
  );
  const userId = user.id;

  const toggle = (projectId: string) => {
    const project = items.find((item) => item.id === projectId);
    if (project) staged.toggle({ id: project.id, name: project.name });
  };

  // Taking them off deletes their future plans there, so Done asks first only
  // when there are some.
  const done = () => {
    const removedIds = staged.toRemove.map((project) => project.id);

    void confirmRemoval({
      projectIds: removedIds,
      userIds: removedIds.length > 0 ? [userId] : [],
      title:
        staged.toRemove.length === 1
          ? `Remove ${fullName(user)} from ${staged.toRemove[0].name}?`
          : `Remove ${fullName(user)} from ${projectCount(staged.toRemove.length)}?`,
      proceed: () =>
        staged.apply([
          ...staged.toAdd.map((project) =>
            links.addMember.mutateAsync({ projectId: project.id, userId }),
          ),
          ...removedIds.map((projectId) =>
            links.removeMember.mutateAsync({ projectId, userId }),
          ),
        ]),
    });
  };

  return (
    <>
      <PanelView
        title={`Add ${fullName(user)} to projects`}
        description="They can log time on these projects. Choose them, then Done; choose one again to take them off."
        create={{ label: "New project", onClick: () => setIsCreating(true) }}
        pendingCount={staged.pendingCount}
        isApplying={staged.isApplying || isChecking}
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

      <ImpactDialog {...confirmProps} />
    </>
  );
};
