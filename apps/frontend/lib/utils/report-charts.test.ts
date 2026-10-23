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
  isPartial = false,
): TimelineBucket => ({
  start,
  end,
  workingDays,
  isPartial,
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
  it("names a week by its days, across a month end too", () => {
    expect(bucketLabel(bucket("2026-10-05", "2026-10-11"))).toBe("Oct 5–11");
    expect(bucketLabel(bucket("2026-09-28", "2026-10-04"))).toBe(
      "Sep 28 – Oct 4",
    );
  });
});

describe("bucketNote", () => {
  it("counts the working days, and says so far where the counting stopped", () => {
    expect(bucketNote(bucket("2026-10-05", "2026-10-11"), null)).toBe("5 days");
    expect(
      bucketNote(bucket("2026-10-19", "2026-10-20", 2, true), "2026-10-20"),
    ).toBe("2 days so far");
  });

  it("never says so far for a week that ended on the last counted day", () => {
    expect(bucketNote(bucket("2026-10-12", "2026-10-18"), "2026-10-18")).toBe(
      "5 days",
    );
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

  it("past five, keeps the colour for the one earlier in the list when sizes tie", () => {
    const many = ["A", "B", "C", "D", "E", "F"];
    const shares = kindOfWork(
      [...many].reverse().map((name) => activity(name, name, 5)),
      many,
    );

    expect(shares.find(({ name }) => name === "E")?.slot).toBe(5);
    expect(shares.at(-1)).toMatchObject({ name: "Other", slot: null });
  });

  it("past five categories, keeps colours for the five largest and lists the rest in Other", () => {
    const many = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const shares = kindOfWork(
      [
        ...many.map((name, i) => activity(name, name, 10 + i)),
        activity("loose", null, 2),
      ],
      many,
    );

    // A to C are the smallest, so they join Other; D to H keep colours in list order.
    expect(shares.map(({ name, slot }) => [name, slot])).toEqual([
      ["H", 5],
      ["G", 4],
      ["F", 3],
      ["E", 2],
      ["D", 1],
      [OTHER_CATEGORIES, null],
      [NO_CATEGORY, null],
    ]);
    const other = shares.at(-2)!;
    expect(other.minutes).toBe(33 * HOUR);
    expect(other.includes?.map(({ name }) => name)).toEqual(["C", "B", "A"]);
  });
});
