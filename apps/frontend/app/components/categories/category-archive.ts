import type { ArchiveActivityCategoryPayload } from "@/types";
import { ActiveActivitiesAction } from "@/types/enums";

export const ARCHIVE_ACTIVITIES_OPTION = "archive-activities";

const itOrThem = (count: number) => (count === 1 ? "it" : "them");

export const archiveActivitiesLabel = (activeActivityCount: number) =>
  `Archive ${itOrThem(activeActivityCount)} too`;

export const noMoveTargetMessage = (activeActivityCount: number) =>
  `There is no other active category, so ${activeActivityCount === 1 ? "it" : "they"} will be archived too.`;

export const archivePayload = (
  activeActivityCount: number,
  archivesActivities: boolean,
  moveToCategoryId: string,
): ArchiveActivityCategoryPayload => {
  if (activeActivityCount === 0) return {};

  return archivesActivities
    ? { activities: ActiveActivitiesAction.ARCHIVE }
    : { activities: ActiveActivitiesAction.MOVE, moveToCategoryId };
};
