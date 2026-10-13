"use client";

import { useState } from "react";

import { useServerSearch } from "@/hooks/useManageListState";
import { useProjectsInfiniteQuery } from "@/hooks/useProjects";
import { ProjectStatus } from "@/types/enums";

import { PanelView } from "../entity-panel/EntityPanelLayout";
import type {
  Choice,
  StagedSelection,
} from "../entity-panel/useStagedSelection";
import { EntityPicker } from "../shared/resource/EntityPicker";
import { ProjectCreateDialog } from "./ProjectCreateDialog";

export const PROJECTS_PICKER = "add-projects";

/** An archived project is read-only, so it keeps its links and is not offered. */
export const activeProjectChoices = (
  projects: (Choice & { status: ProjectStatus })[],
): Choice[] =>
  projects
    .filter((project) => project.status === ProjectStatus.ACTIVE)
    .map(({ id, name }) => ({ id, name }));

interface ProjectChoicesPickerProps {
  title: string;
  description: string;
  staged: StagedSelection<Choice>;
  isApplying: boolean;
  onDone: () => void;
}

/** Picks active projects for a person or an activity, or makes a new one. */
export const ProjectChoicesPicker = ({
  title,
  description,
  staged,
  isApplying,
  onDone,
}: ProjectChoicesPickerProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { searchQuery, setSearch } = useServerSearch();
  const { items, isLoading, pagination } = useProjectsInfiniteQuery({
    status: ProjectStatus.ACTIVE,
    search: searchQuery,
  });

  return (
    <>
      <PanelView
        title={title}
        description={description}
        create={{ label: "New project", onClick: () => setIsCreating(true) }}
        pendingCount={staged.pendingCount}
        isApplying={isApplying}
        onDone={onDone}
        onCancel={staged.cancel}
      >
        <EntityPicker
          items={items}
          selectedIds={staged.selectedIds}
          onToggle={staged.toggle}
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

      <ProjectCreateDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={staged.select}
      />
    </>
  );
};
