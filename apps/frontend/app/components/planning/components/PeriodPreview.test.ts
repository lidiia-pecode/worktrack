import { describe, expect, it } from "vitest";

import { noDaysReason } from "./PeriodPreview";

const reason = (days: {
  weekdays: number;
  awayDays: number;
  inAnotherTeam: number;
}) => noDaysReason({ firstName: "Sam", ...days });

describe("noDaysReason", () => {
  it("names the one cause when every weekday shares it", () => {
    expect(reason({ weekdays: 0, awayDays: 0, inAnotherTeam: 0 })).toMatch(
      /only weekends/,
    );
    expect(reason({ weekdays: 5, awayDays: 5, inAnotherTeam: 0 })).toMatch(
      /Sam is away on every weekday/,
    );
    expect(reason({ weekdays: 5, awayDays: 0, inAnotherTeam: 5 })).toMatch(
      /are in another team/,
    );
  });

  it("names every cause for a mix, or for days it can't tell apart", () => {
    const mixed = reason({ weekdays: 5, awayDays: 2, inAnotherTeam: 3 });
    const unexplained = reason({ weekdays: 5, awayDays: 0, inAnotherTeam: 0 });

    expect(mixed).toMatch(/away, in another team, or weren't working here/);
    expect(unexplained).toBe(mixed);
  });
});
