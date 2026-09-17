import { Clock3, UsersRound } from "lucide-react";

import { UserRole } from "@/types/enums";

import { EmptyState } from "../../shared/EmptyState";

type TeamEmptyStateProps = {
  hasNobodyToShow: boolean;
  role: UserRole;
  weekLabel: string;
};

export function TeamEmptyState({
  hasNobodyToShow,
  role,
  weekLabel,
}: TeamEmptyStateProps) {
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
