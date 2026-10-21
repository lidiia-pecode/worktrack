import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WeekDay } from "@/types/enums";
import {
  addWeeks,
  companyToday,
  getWeekStart,
  isSameDay,
} from "@/lib/utils/date";

import { BackToThisWeekButton } from "./WeekNav";

vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({ weekStartDay: WeekDay.MONDAY, timezone: "UTC" }),
}));

const thisWeek = () => getWeekStart(companyToday("UTC"), WeekDay.MONDAY);

describe("BackToThisWeekButton", () => {
  it("is not shown on the current week", () => {
    render(
      <BackToThisWeekButton weekStart={thisWeek()} onWeekChange={vi.fn()} />,
    );

    expect(
      screen.queryByRole("button", { name: "Back to this week" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the current week from another one", async () => {
    const user = userEvent.setup();
    const onWeekChange = vi.fn();
    render(
      <BackToThisWeekButton
        weekStart={addWeeks(thisWeek(), -2)}
        onWeekChange={onWeekChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Back to this week" }));

    const shown = getWeekStart(onWeekChange.mock.calls[0][0], WeekDay.MONDAY);
    expect(isSameDay(shown, thisWeek())).toBe(true);
  });
});
