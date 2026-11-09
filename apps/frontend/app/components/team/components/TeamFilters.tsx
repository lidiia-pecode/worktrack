"use client";

import { useMemo } from "react";
import { X } from "lucide-react";

import { useAllProjectsQuery } from "@/hooks/useProjects";
import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { Button } from "@/components/ui/button";

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
  onProjectChange?: (projectId?: string) => void;
  /** Active projects only, for a grid where nothing can go on a past one. */
  activeProjectsOnly?: boolean;
  search?: string;
  onSearchChange?: (search: string) => void;
  /** Resets every filter and the search; offered only while one is set. */
  onClear?: () => void;
};

export const TeamFilters = ({
  teamId,
  projectId,
  onTeamChange,
  onProjectChange,
  activeProjectsOnly = false,
  search = "",
  onSearchChange,
  onClear,
}: TeamFiltersProps) => {
  const { options: activeTeamOptions, choosesTeam } = useTeamChoice();

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

  const hasActiveFilters =
    Boolean(teamId ?? projectId) || Boolean(search.trim());

  return (
    <FilterBar className="py-3 sm:gap-6">
      {onSearchChange && (
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search by name or position"
          className="sm:min-w-48 sm:flex-1"
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {choosesTeam && (
          <FormSelect
            aria-label="Team"
            className="sm:w-56"
            value={teamId ?? ALL_OPTION}
            options={teamOptions}
            onValueChange={(value) => onTeamChange(toFilterValue(value))}
          />
        )}

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

      {onClear && hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          className="animate-in fade-in self-start sm:ml-auto"
        >
          <X aria-hidden />
          Clear filters
        </Button>
      )}
    </FilterBar>
  );
};
