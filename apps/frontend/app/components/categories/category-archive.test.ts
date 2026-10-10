import { describe, expect, it } from "vitest";

import { ActiveActivitiesAction } from "@/types/enums";

import {
  ARCHIVE_ACTIVITIES_OPTION,
  archiveActivitiesLabel,
  archivePayload,
  DRAFTS_OPTION,
  noMoveTargetMessage,
} from "./category-archive";

describe("category archive copy", () => {
  it("speaks of one activity and of several", () => {
    expect(archiveActivitiesLabel(1)).toBe("Archive it too");
    expect(archiveActivitiesLabel(2)).toBe("Archive them too");
    expect(noMoveTargetMessage(1)).toBe(
      "There is no other active category, so it will be archived too.",
    );
    expect(noMoveTargetMessage(2)).toBe(
      "There is no other active category, so they will be archived too.",
    );
  });
});

describe("archivePayload", () => {
  it("sends nothing extra when there is nothing to move", () => {
    expect(archivePayload(0, "target")).toEqual({});
  });

  it("moves them, archives them, or leaves them as drafts", () => {
    expect(archivePayload(2, "target")).toEqual({
      activities: ActiveActivitiesAction.MOVE,
      moveToCategoryId: "target",
    });
    expect(archivePayload(2, ARCHIVE_ACTIVITIES_OPTION)).toEqual({
      activities: ActiveActivitiesAction.ARCHIVE,
    });
    expect(archivePayload(2, DRAFTS_OPTION)).toEqual({
      activities: ActiveActivitiesAction.UNCATEGORIZE,
    });
  });
});
