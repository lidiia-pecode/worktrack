import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeekHeaderDay } from "./WeekHeaderDay";

const SATURDAY = new Date("2026-10-24T00:00:00");
const MONDAY = new Date("2026-10-26T00:00:00");

describe("WeekHeaderDay", () => {
  it("heads a weekend like any day, with its time in the warning colour", () => {
    const { container } = render(
      <WeekHeaderDay
        date={SATURDAY}
        isToday={false}
        totalMinutes={600}
        targetMinutes={0}
      />,
    );

    expect(container.firstChild).not.toHaveClass("bg-stripes-weekend");
    expect(container.firstChild).not.toHaveClass("bg-stripes-extra");
    expect(screen.getByText("10h")).toHaveClass("text-warning-text");
  });

  it("leaves a working day's time neutral when it expects nothing, as at 0h", () => {
    render(
      <WeekHeaderDay
        date={MONDAY}
        isToday={false}
        totalMinutes={120}
        targetMinutes={0}
      />,
    );

    expect(screen.getByText("2h")).not.toHaveClass("text-warning-text");
  });
});
