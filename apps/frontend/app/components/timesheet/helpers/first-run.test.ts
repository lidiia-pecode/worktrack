import { describe, expect, it } from "vitest";

import { showsWeekFigures, timesheetContentFor } from "./first-run";

const NOTHING = {
  loggableActivities: 0,
  ownProjects: 0,
  timeLogs: 0,
  absences: 0,
  isCurrentWeek: true,
};

describe("timesheetContentFor", () => {
  it("says someone on no project is not on any projects", () => {
    expect(timesheetContentFor(NOTHING)).toBe("notOnProjects");
  });

  it("says projects with no activities have no activities yet", () => {
    expect(timesheetContentFor({ ...NOTHING, ownProjects: 2 })).toBe(
      "noActivities",
    );
  });

  it("shows the week once any project has an activity", () => {
    expect(
      timesheetContentFor({
        ...NOTHING,
        ownProjects: 2,
        loggableActivities: 1,
      }),
    ).toBe("week");
  });

  it("shows the week of someone on no project who is away", () => {
    expect(timesheetContentFor({ ...NOTHING, absences: 1 })).toBe("week");
  });

  it("always shows another week, so its navigation stays", () => {
    expect(timesheetContentFor({ ...NOTHING, isCurrentWeek: false })).toBe(
      "week",
    );
  });

  it("shows the week that still holds time logged earlier", () => {
    expect(timesheetContentFor({ ...NOTHING, timeLogs: 1 })).toBe("week");
  });
});

describe("showsWeekFigures", () => {
  it("hides the figures while there is nothing to log and nothing logged", () => {
    expect(showsWeekFigures({ loggableActivities: 0, timeLogs: 0 })).toBe(
      false,
    );
  });

  it("shows them once there is something to log", () => {
    expect(showsWeekFigures({ loggableActivities: 1, timeLogs: 0 })).toBe(true);
  });

  it("shows them for a week with time logged, even with nothing left to log", () => {
    expect(showsWeekFigures({ loggableActivities: 0, timeLogs: 3 })).toBe(true);
  });
});
