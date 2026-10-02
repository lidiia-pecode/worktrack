import type { ReactNode } from "react";

import type { ArchiveActivityCategoryPayload } from "@/types";
import { ActiveActivitiesAction } from "@/types/enums";

import { boldNameList } from "../activities/archive-impact";

export const ARCHIVE_ACTIVITIES_OPTION = "archive-activities";

const itOrThem = (count: number) => (count === 1 ? "it" : "them");

export const activityCount = (count: number) =>
  `${count} active ${count === 1 ? "activity" : "activities"}`;

export const categoryArchiveDescription = (
  categoryName: string,
  activityNames: string[],
): ReactNode =>
  activityNames.length === 0 ? (
    `Nobody will be able to put new activities in ${categoryName}. You can restore it later.`
  ) : (
    <>
      {categoryName} still has {activityCount(activityNames.length)}:{" "}
      {boldNameList(activityNames)}.
    </>
  );

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
