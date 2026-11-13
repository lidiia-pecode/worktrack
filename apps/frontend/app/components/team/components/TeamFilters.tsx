"use client";

import { useMemo } from "react";

import { useAllProjectsQuery } from "@/hooks/useProjects";
import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { FilterBar } from "../../shared/FilterBar";
import { FormSelect } from "../../shared/FormSelect";
import { SearchInput } from "../../shared/inputs/SearchInput";
import { useTeamChoice } from "../useTeamChoice";

export const ALL_OPTION = "all";

const STATUS_SUFFIX: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: "",
  [ProjectStatus.ARCHIVED]: " (archived)",
};

type TeamFiltersProps = {
  teamId?: string;
  projectId?: string;
  onTeamChange: (teamId?: string) => void;
  onProjectChange: (projectId?: string) => void;
  /** Active projects only, for a grid where nothing can go on a past one. */
  activeProjectsOnly?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
};

export const TeamFilters = ({
  teamId,
  projectId,
  onTeamChange,
  onProjectChange,
  activeProjectsOnly = false,
  search,
  onSearchChange,
}: TeamFiltersProps) => {
  const { options: activeTeamOptions, choosesTeam } = useTeamChoice();

  // Every status, so a past project's time can still be looked at.
  const { items: projects } = useAllProjectsQuery();

  const teamOptions = useMemo(
    () => [{ value: ALL_OPTION, label: "All teams" }, ...activeTeamOptions],
    [activeTeamOptions],
  );

  const projectOptions = useMemo(() => {
    const isActive = (project: Project) =>
      project.status === ProjectStatus.ACTIVE;
    const listed = activeProjectsOnly
      ? projects.filter(isActive)
      : [
          ...projects.filter(isActive),
          ...projects.filter((project) => !isActive(project)),
        ];

    return [
      { value: ALL_OPTION, label: "All projects" },
      ...listed.map((project) => ({
        value: project.id,
        label: `${project.name}${STATUS_SUFFIX[project.status]}`,
      })),
    ];
  }, [projects, activeProjectsOnly]);

  const toFilterValue = (value: string) =>
    value === ALL_OPTION ? undefined : value;

  return (
    <FilterBar className="py-3 sm:gap-4">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search by name or position"
        className="sm:min-w-48 sm:flex-1"
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        {choosesTeam && (
          <FormSelect
            aria-label="Team"
            className="sm:w-48"
            value={teamId ?? ALL_OPTION}
            options={teamOptions}
            onValueChange={(value) => onTeamChange(toFilterValue(value))}
          />
        )}

        <FormSelect
          aria-label="Project"
          className="sm:w-48"
          value={projectId ?? ALL_OPTION}
          options={projectOptions}
          onValueChange={(value) => onProjectChange(toFilterValue(value))}
        />
      </div>
    </FilterBar>
  );
};
