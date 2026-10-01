import { UserRole } from "@/types/enums";

export type OnlyViewerReason = "alone" | "noTeam" | "emptyTeam" | "emptyTeams";

interface OnlyViewerInput {
  role: UserRole;
  viewerId: string;
  rowUserIds: string[];
  hasActiveFilters: boolean;
  ledTeamCount: number;
}

export const onlyViewerReason = ({
  role,
  viewerId,
  rowUserIds,
  hasActiveFilters,
  ledTeamCount,
}: OnlyViewerInput): OnlyViewerReason | null => {
  if (hasActiveFilters) return null;
  if (rowUserIds.some((id) => id !== viewerId)) return null;

  if (role === UserRole.OWNER) return "alone";

  if (ledTeamCount === 0) return "noTeam";

  return ledTeamCount === 1 ? "emptyTeam" : "emptyTeams";
};
