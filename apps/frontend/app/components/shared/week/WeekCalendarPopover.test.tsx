import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WeekDay } from "@/types/enums";

import { WeekCalendarPopover } from "./WeekCalendarPopover";

vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({ weekStartDay: WeekDay.MONDAY, timezone: "UTC" }),
}));

const chosenDays = () =>
  screen
    .getAllByRole("button", { name: /selected week$/ })
    .map((day) => day.textContent);

describe("WeekCalendarPopover", () => {
  it("draws the whole week under the pointer as the one a click picks", async () => {
    const user = userEvent.setup();
    render(
      <WeekCalendarPopover
        weekStart={new Date(2026, 9, 5)}
        onSelectWeek={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(chosenDays()).toEqual(["5", "6", "7", "8", "9", "10", "11"]);

    await user.hover(screen.getByRole("button", { name: /October 21/ }));

    expect(chosenDays()).toEqual(["19", "20", "21", "22", "23", "24", "25"]);
  });

  it("names the way back the same as the week pages do", () => {
    render(
      <WeekCalendarPopover
        weekStart={new Date(2026, 9, 5)}
        onSelectWeek={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Back to this week" }),
    ).toBeInTheDocument();
  });
});
