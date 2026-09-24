"use client";

import { useMemo } from "react";

import { useAllProjectsQuery } from "@/hooks/useProjects";
import { useTeamOptions } from "@/hooks/useTeams";
import { ProjectStatus } from "@/types/enums";

import { FilterBar } from "../../shared/FilterBar";
import { FormSelect } from "../../shared/FormSelect";

export const ALL_OPTION = "all";

type TeamFiltersProps = {
  teamId?: string;
  projectId?: string;
  onTeamChange: (teamId?: string) => void;
  onProjectChange?: (projectId?: string) => void;
};

export function TeamFilters({
  teamId,
  projectId,
  onTeamChange,
  onProjectChange,
}: TeamFiltersProps) {
  const { options: activeTeamOptions } = useTeamOptions();

  const { items: projects } = useAllProjectsQuery({
    status: ProjectStatus.ACTIVE,
  });

  const teamOptions = useMemo(
    () => [{ value: ALL_OPTION, label: "All teams" }, ...activeTeamOptions],
    [activeTeamOptions],
  );

  const projectOptions = useMemo(
    () => [
      { value: ALL_OPTION, label: "All projects" },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ],
    [projects],
  );

  const toFilterValue = (value: string) =>
    value === ALL_OPTION ? undefined : value;

  return (
    <FilterBar className="px-3 py-3">
      <FormSelect
        label="Team"
        className="sm:w-56"
        value={teamId ?? ALL_OPTION}
        options={teamOptions}
        onValueChange={(value) => onTeamChange(toFilterValue(value))}
      />

      {onProjectChange && (
        <FormSelect
          label="Project"
          className="sm:w-56"
          value={projectId ?? ALL_OPTION}
          options={projectOptions}
          onValueChange={(value) => onProjectChange(toFilterValue(value))}
        />
      )}
    </FilterBar>
  );
}
