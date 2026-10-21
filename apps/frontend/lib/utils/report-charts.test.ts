import { describe, expect, it } from "vitest";

import { HoursReportRow, TimelineBucket } from "@/types";

import {
  bucketLabel,
  bucketNote,
  kindOfWork,
  NO_CATEGORY,
  OTHER_CATEGORIES,
} from "./report-charts";

const HOUR = 60;

const bucket = (
  start: string,
  end: string,
  workingDays = 5,
): TimelineBucket => ({
  start,
  end,
  workingDays,
  isPartial: false,
  loggedMinutes: 0,
  billableMinutes: 0,
  plannedMinutes: 0,
  expectedMinutes: 0,
});

const activity = (
  name: string,
  category: string | null,
  hours: number,
): HoursReportRow => ({
  id: name,
  name,
  detail: category,
  billableMinutes: 0,
  nonBillableMinutes: hours * HOUR,
  totalMinutes: hours * HOUR,
  plannedMinutes: null,
  peopleCount: null,
});

describe("bucketLabel", () => {
  it("names a week by its days, across a month end too, and a month by its name", () => {
    expect(bucketLabel(bucket("2026-10-05", "2026-10-11"), "week")).toBe(
      "Oct 5–11",
    );
    expect(bucketLabel(bucket("2026-09-28", "2026-10-04"), "week")).toBe(
      "Sep 28 – Oct 4",
    );
    expect(bucketLabel(bucket("2026-10-01", "2026-10-31"), "month")).toBe(
      "Oct",
    );
  });
});

describe("bucketNote", () => {
  it("counts the working days, and says so far where the counting stopped", () => {
    expect(bucketNote(bucket("2026-10-05", "2026-10-11"), null)).toBe("5 days");
    expect(
      bucketNote(bucket("2026-10-19", "2026-10-20", 2), "2026-10-20"),
    ).toBe("2 days so far");
  });
});

describe("kindOfWork", () => {
  const categories = ["Design", "Development", "Management", "Meetings"];

  it("adds activities up by category, largest first, with the shares", () => {
    expect(
      kindOfWork(
        [
          activity("Backend", "Development", 30),
          activity("Frontend", "Development", 24),
          activity("UI Design", "Design", 10),
          activity("Stand-up", "Meetings", 12),
        ],
        categories,
      ),
    ).toEqual([
      { name: "Development", minutes: 54 * HOUR, share: 71, slot: 2 },
      { name: "Meetings", minutes: 12 * HOUR, share: 16, slot: 3 },
      { name: "Design", minutes: 10 * HOUR, share: 13, slot: 1 },
    ]);
  });

  it("colours the categories with time in the list's order, not by size", () => {
    const shares = kindOfWork(
      [activity("Stand-up", "Meetings", 20), activity("UI", "Design", 1)],
      categories,
    );

    // Design comes before Meetings in the list, so it takes the first colour.
    expect(shares.map(({ name, slot }) => [name, slot])).toEqual([
      ["Meetings", 2],
      ["Design", 1],
    ]);
  });

  it("gives a category further down a long list a colour while few have time", () => {
    const many = ["A", "B", "C", "D", "E", "F", "G", "H"];

    expect(
      kindOfWork([activity("h", "H", 3)], many).map(({ slot }) => slot),
    ).toEqual([1]);
  });

  it("past six, keeps the colour for the one earlier in the list when sizes tie", () => {
    const many = ["A", "B", "C", "D", "E", "F", "G"];
    const shares = kindOfWork(
      [...many].reverse().map((name) => activity(name, name, 5)),
      many,
    );

    expect(shares.find(({ name }) => name === "F")?.slot).toBe(6);
    expect(shares.at(-1)).toMatchObject({ name: "Other", slot: null });
  });

  it("past six categories, keeps colours for the six largest and puts the rest in Other", () => {
    const many = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const shares = kindOfWork(
      [
        ...many.map((name, i) => activity(name, name, 10 + i)),
        activity("loose", null, 2),
      ],
      many,
    );

    // A and B are the smallest, so they join Other; C to H keep colours in list order.
    expect(shares.map(({ name, slot }) => [name, slot])).toEqual([
      ["H", 6],
      ["G", 5],
      ["F", 4],
      ["E", 3],
      ["D", 2],
      ["C", 1],
      [OTHER_CATEGORIES, null],
      [NO_CATEGORY, null],
    ]);
    expect(shares.at(-2)?.minutes).toBe(21 * HOUR);
  });
});
