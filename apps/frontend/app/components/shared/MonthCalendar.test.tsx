import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WeekDay } from "@/types/enums";

import { MonthCalendar } from "./MonthCalendar";

vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({ weekStartDay: WeekDay.MONDAY, timezone: "UTC" }),
}));

const tabStops = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("tabindex") === "0")
    .map((button) => button.getAttribute("data-date"));

describe("MonthCalendar", () => {
  it("keeps one day in the Tab order and moves it with the arrow keys, across months", async () => {
    const user = userEvent.setup();
    render(
      <MonthCalendar
        initialMonth={new Date("2026-11-30T00:00:00")}
        selectionLabel="chosen"
        autoFocusDate={new Date("2026-11-30T00:00:00")}
        onSelectDay={vi.fn()}
      />,
    );

    expect(tabStops()).toEqual(["2026-11-30"]);
    expect(screen.getByText("November 2026")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-12-01");
    expect(screen.getByText("December 2026")).toBeInTheDocument();
    expect(tabStops()).toEqual(["2026-12-01"]);

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toHaveAttribute("data-date", "2026-11-24");
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });

  it("picks the focused day with Enter", async () => {
    const user = userEvent.setup();
    const onSelectDay = vi.fn();
    render(
      <MonthCalendar
        initialMonth={new Date("2026-11-02T00:00:00")}
        selectionLabel="chosen"
        autoFocusDate={new Date("2026-11-02T00:00:00")}
        onSelectDay={onSelectDay}
      />,
    );

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelectDay).toHaveBeenCalledWith(new Date("2026-11-09T00:00:00"));
  });
});
