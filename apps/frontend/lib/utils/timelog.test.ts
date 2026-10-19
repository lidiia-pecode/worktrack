import { describe, expect, it } from "vitest";

import { TimeLog } from "@/types";

import { groupTimelogsByDate } from "./timelog";

const log = (id: string, date: string, createdAt: string) =>
  ({ id, date, createdAt }) as TimeLog;

describe("groupTimelogsByDate", () => {
  it("lists each day's entries in the order they were logged", () => {
    // Newest first, as the API sends them.
    const grouped = groupTimelogsByDate([
      log("standup", "2026-10-13", "2026-10-13T16:00:00Z"),
      log("review", "2026-10-13", "2026-10-13T09:00:00Z"),
      log("backend", "2026-10-12", "2026-10-12T17:00:00Z"),
    ]);

    expect(grouped["2026-10-13"].map((entry) => entry.id)).toEqual([
      "review",
      "standup",
    ]);
    expect(grouped["2026-10-12"].map((entry) => entry.id)).toEqual(["backend"]);
  });
});
