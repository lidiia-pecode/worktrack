import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActiveActivitiesAction } from "@/types/enums";

import {
  activityCount,
  archiveActivitiesLabel,
  archivePayload,
  categoryArchiveDescription,
  noMoveTargetMessage,
} from "./category-archive";

const description = (activityNames: string[]) =>
  renderToStaticMarkup(
    <>{categoryArchiveDescription("Design", activityNames)}</>,
  );

const bold = (name: string) =>
  `<strong class="font-semibold text-foreground">${name}</strong>`;

describe("category archive copy", () => {
  it("counts the activities it names", () => {
    expect(activityCount(1)).toBe("1 active activity");
    expect(description(["Wireframes", "Research"])).toBe(
      `Design still has 2 active activities: ${bold("Wireframes")} and ${bold("Research")}.`,
    );
  });

  it("is a plain confirmation when no active activity is left", () => {
    expect(description([])).toBe(
      "Nobody will be able to put new activities in Design. You can restore it later.",
    );
  });

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
