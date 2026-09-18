import { Clock3, SearchX, UsersRound } from "lucide-react";

import { UserRole } from "@/types/enums";

import { Button } from "@/components/ui/button";

import { EmptyState } from "../../shared/EmptyState";

type TeamEmptyStateProps = {
  hasNobodyToShow: boolean;
  hasActiveFilters: boolean;
  role: UserRole;
  weekLabel: string;
  onClearFilters: () => void;
};

export function TeamEmptyState({
  hasNobodyToShow,
  hasActiveFilters,
  role,
  weekLabel,
  onClearFilters,
}: TeamEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <EmptyState
        icon={<SearchX />}
        title="Nothing matches these filters"
        description={`No logged time in the week of ${weekLabel} for the team and project you picked.`}
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  if (hasNobodyToShow) {
    return (
      <EmptyState
        icon={<UsersRound />}
        title={
          role === UserRole.MANAGER
            ? "You don't lead a team yet"
            : "Nobody to show yet"
        }
        description={
          role === UserRole.MANAGER
            ? "You see the people in teams you manage. Ask an owner to make you the manager of a team, and their week will appear here."
            : "Once people join the workspace, their logged time will appear here."
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<Clock3 />}
      title="No time logged this week"
      description={`Nobody logged time in the week of ${weekLabel}. Use the week navigation above to look at another week.`}
    />
  );
}
