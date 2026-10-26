import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeekHeaderDay } from "./WeekHeaderDay";

const SATURDAY = new Date("2026-10-24T00:00:00");

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
});
