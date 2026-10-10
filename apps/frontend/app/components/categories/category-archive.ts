import type { ArchiveActivityCategoryPayload } from "@/types";
import { ActiveActivitiesAction } from "@/types/enums";

export const ARCHIVE_ACTIVITIES_OPTION = "archive-activities";

const itOrThem = (count: number) => (count === 1 ? "it" : "them");

export const archiveActivitiesLabel = (activeActivityCount: number) =>
  `Archive ${itOrThem(activeActivityCount)} too`;

export const noMoveTargetMessage = (activeActivityCount: number) =>
  `There is no other active category, so ${activeActivityCount === 1 ? "it" : "they"} will be archived too.`;

/** Only activities no project links may be left without a category. */
export const DRAFTS_OPTION = "leave-as-drafts";

export const draftsLabel = (activeActivityCount: number) =>
  `Leave ${itOrThem(activeActivityCount)} without a category, as drafts`;

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
