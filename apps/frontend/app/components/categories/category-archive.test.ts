import { describe, expect, it } from "vitest";

import { ActiveActivitiesAction } from "@/types/enums";

import {
  archiveActivitiesLabel,
  archivePayload,
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
    expect(archivePayload(0, false, "target")).toEqual({});
  });

  it("moves to the chosen category or archives them", () => {
    expect(archivePayload(2, false, "target")).toEqual({
      activities: ActiveActivitiesAction.MOVE,
      moveToCategoryId: "target",
    });
    expect(archivePayload(2, true, "archive-activities")).toEqual({
      activities: ActiveActivitiesAction.ARCHIVE,
    });
  });
});
