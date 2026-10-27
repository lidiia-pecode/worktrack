"use client";

import { useMemo } from "react";

import { useAllProjectsQuery } from "@/hooks/useProjects";
import { useTeamOptions } from "@/hooks/useTeams";
import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { FilterBar } from "../../shared/FilterBar";
import { FormSelect } from "../../shared/FormSelect";
import { SearchInput } from "../../shared/inputs/SearchInput";

export const ALL_OPTION = "all";

const STATUS_SUFFIX: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: "",
  [ProjectStatus.ARCHIVED]: " (archived)",
  [ProjectStatus.COMPLETED]: " (completed)",
};

type TeamFiltersProps = {
  teamId?: string;
  projectId?: string;
  onTeamChange: (teamId?: string) => void;
  onProjectChange?: (projectId?: string) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
};

export const TeamFilters = ({
  teamId,
  projectId,
  onTeamChange,
  onProjectChange,
  search = "",
  onSearchChange,
}: TeamFiltersProps) => {
  const { options: activeTeamOptions } = useTeamOptions();

  // Every status, so a past project's time can still be looked at.
  const { items: projects } = useAllProjectsQuery(undefined, {
    enabled: Boolean(onProjectChange),
  });

  const teamOptions = useMemo(
    () => [{ value: ALL_OPTION, label: "All teams" }, ...activeTeamOptions],
    [activeTeamOptions],
  );

  const projectOptions = useMemo(() => {
    const isActive = (project: Project) =>
      project.status === ProjectStatus.ACTIVE;
    const activeFirst = [
      ...projects.filter(isActive),
      ...projects.filter((project) => !isActive(project)),
    ];

    return [
      { value: ALL_OPTION, label: "All projects" },
      ...activeFirst.map((project) => ({
        value: project.id,
        label: `${project.name}${STATUS_SUFFIX[project.status]}`,
      })),
    ];
  }, [projects]);

  const toFilterValue = (value: string) =>
    value === ALL_OPTION ? undefined : value;

  return (
    <FilterBar className="px-3 py-3 sm:gap-6">
      {onSearchChange && (
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search by name or position"
          className="sm:min-w-48 sm:flex-1"
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <FormSelect
          aria-label="Team"
          className="sm:w-56"
          value={teamId ?? ALL_OPTION}
          options={teamOptions}
          onValueChange={(value) => onTeamChange(toFilterValue(value))}
        />

        {onProjectChange && (
          <FormSelect
            aria-label="Project"
            className="sm:w-56"
            value={projectId ?? ALL_OPTION}
            options={projectOptions}
            onValueChange={(value) => onProjectChange(toFilterValue(value))}
          />
        )}
      </div>
    </FilterBar>
  );
};
