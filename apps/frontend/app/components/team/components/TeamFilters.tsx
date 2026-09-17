"use client";

import { useMemo } from "react";

import { useProjectsQuery } from "@/hooks/useProjects";
import { useTeamsQuery } from "@/hooks/useTeams";
import { ProjectStatus, TeamStatus } from "@/types/enums";

import { FilterBar } from "../../shared/FilterBar";
import { FormSelect } from "../../shared/FormSelect";

export const ALL_OPTION = "all";

const FILTER_PAGE_SIZE = 200;

type TeamFiltersProps = {
  teamId?: string;
  projectId?: string;
  onTeamChange: (teamId?: string) => void;
  onProjectChange: (projectId?: string) => void;
};

export function TeamFilters({
  teamId,
  projectId,
  onTeamChange,
  onProjectChange,
}: TeamFiltersProps) {
  const { items: teams } = useTeamsQuery(1, {
    status: TeamStatus.ACTIVE,
    pageSize: FILTER_PAGE_SIZE,
  });

  const { items: projects } = useProjectsQuery(1, {
    status: ProjectStatus.ACTIVE,
    pageSize: FILTER_PAGE_SIZE,
  });

  const teamOptions = useMemo(
    () => [
      { value: ALL_OPTION, label: "All teams" },
      ...teams.map((team) => ({ value: team.id, label: team.name })),
    ],
    [teams],
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

      <FormSelect
        label="Project"
        className="sm:w-56"
        value={projectId ?? ALL_OPTION}
        options={projectOptions}
        onValueChange={(value) => onProjectChange(toFilterValue(value))}
      />
    </FilterBar>
  );
}
