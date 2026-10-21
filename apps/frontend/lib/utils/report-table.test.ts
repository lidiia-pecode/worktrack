import { describe, expect, it } from "vitest";

import { describeGap, nextSort, sortRows } from "./report-table";

const HOUR = 60;

describe("describeGap", () => {
  it("says which way logged time differs from the plan", () => {
    expect(describeGap(140 * HOUR, 180 * HOUR, "planned")).toEqual({
      label: "40h less than planned",
      isNotable: true,
    });
    expect(describeGap(112 * HOUR, 96 * HOUR, "planned")).toEqual({
      label: "16h more than planned",
      isNotable: true,
    });
  });

  it("speaks of expected hours for people", () => {
    expect(describeGap(88 * HOUR, 80 * HOUR, "expected")).toEqual({
      label: "8h more than expected",
      isNotable: false,
    });
  });

  it("reads a gap under an hour as on plan or as expected", () => {
    expect(describeGap(95 * HOUR + 30, 96 * HOUR, "planned").label).toBe(
      "On plan",
    );
    expect(describeGap(80 * HOUR - 59, 80 * HOUR, "expected").label).toBe(
      "As expected",
    );
  });

  it("marks only a gap over a tenth of the reference", () => {
    expect(describeGap(88 * HOUR, 80 * HOUR, "expected").isNotable).toBe(false);
    expect(describeGap(89 * HOUR, 80 * HOUR, "expected").isNotable).toBe(true);
  });

  it("says when there was nothing to compare with", () => {
    expect(describeGap(10 * HOUR, 0, "planned")).toEqual({
      label: "Nothing planned",
      isNotable: false,
    });
    expect(describeGap(0, 0, "expected").label).toBe("Nothing expected");
  });
});

describe("sorting", () => {
  it("starts a number column with the largest and a name with the first", () => {
    expect(nextSort(null, "logged", true)).toEqual({
      column: "logged",
      direction: "desc",
    });
    expect(nextSort(null, "name", false)).toEqual({
      column: "name",
      direction: "asc",
    });
  });

  it("turns the same column around", () => {
    expect(
      nextSort({ column: "logged", direction: "desc" }, "logged", true),
    ).toEqual({ column: "logged", direction: "asc" });
  });

  it("sorts a copy, keeping the server's order for equal values", () => {
    const rows = [
      { name: "Alice", minutes: 60 },
      { name: "Ben", minutes: 120 },
      { name: "Cara", minutes: 60 },
    ];

    expect(
      sortRows(rows, (row) => row.minutes, "desc").map((row) => row.name),
    ).toEqual(["Ben", "Alice", "Cara"]);
    expect(
      sortRows(rows, (row) => row.name, "desc").map((row) => row.name),
    ).toEqual(["Cara", "Ben", "Alice"]);
    expect(rows[0].name).toBe("Alice");
  });
});
