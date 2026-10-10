import type { ArchiveActivityCategoryPayload } from "@/types";
import { ActiveActivitiesAction } from "@/types/enums";
import { byCount } from "@/lib/utils/text";

export const ARCHIVE_ACTIVITIES_OPTION = "archive-activities";

export const archiveActivitiesLabel = (activeActivityCount: number) =>
  `Archive ${byCount(activeActivityCount, "it", "them")} too`;

export const noMoveTargetMessage = (activeActivityCount: number) =>
  `There is no other active category, so ${byCount(activeActivityCount, "it", "they")} will be archived too.`;

export const DRAFTS_OPTION = "leave-as-drafts";

export const draftsLabel = (activeActivityCount: number) =>
  `Leave ${byCount(activeActivityCount, "it", "them")} without a category, as drafts`;

export const archivePayload = (
  activeActivityCount: number,
  selectedOption: string,
): ArchiveActivityCategoryPayload => {
  if (activeActivityCount === 0) return {};

  if (selectedOption === ARCHIVE_ACTIVITIES_OPTION) {
    return { activities: ActiveActivitiesAction.ARCHIVE };
  }
  if (selectedOption === DRAFTS_OPTION) {
    return { activities: ActiveActivitiesAction.UNCATEGORIZE };
  }

  return {
    activities: ActiveActivitiesAction.MOVE,
    moveToCategoryId: selectedOption,
  };
};

/** Each project once, in name order, when several activities share it. */
export const distinctProjects = <T extends { id: string; name: string }>(
  projects: T[],
): T[] =>
  [...new Map(projects.map((project) => [project.id, project])).values()].sort(
    (a, b) => a.name.localeCompare(b.name),
  );
