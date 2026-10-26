import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimeLog } from "@/types";

import { DayColumn } from "./DayColumn";

const entry: TimeLog = {
  id: "log-1",
  userId: "user-1",
  isBillable: true,
  minutes: 90,
  note: "Sprint review",
  date: "2026-10-14",
  createdAt: "2026-10-14T09:00:00Z",
  updatedAt: "2026-10-14T09:00:00Z",
};

const renderDay = (
  timelogs: TimeLog[],
  { date = "2026-10-14", expectedMinutes = 480, canLogTime = true } = {},
) => (
  <DayColumn
    date={new Date(`${date}T00:00:00`)}
    timelogs={timelogs}
    plannedEntries={[]}
    isAbsenceLocked={false}
    totalMinutes={timelogs.reduce((sum, log) => sum + log.minutes, 0)}
    pixelsPerMinute={1}
    expectedMinutes={expectedMinutes}
    isLocked={false}
    isEditable
    canLogTime={canLogTime}
    onAddClick={vi.fn()}
    onAbsenceClick={vi.fn()}
    onEntryClick={vi.fn()}
  />
);

describe("DayColumn", () => {
  it("drops an entry's hover card once the entry is deleted", async () => {
    const user = userEvent.setup();
    const { rerender } = render(renderDay([entry]));

    await user.hover(screen.getByRole("button", { name: /^1h 30m/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Sprint review");

    rerender(renderDay([]));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("puts time over the day's figure on solid amber, with how much", () => {
    const { container } = render(renderDay([{ ...entry, minutes: 540 }]));

    expect(screen.getByText("+1h")).toBeInTheDocument();
    expect(container.querySelector(".bg-excess")).toBeInTheDocument();
  });

  it("stripes a weekend, in amber once it has time, with no badge over the entry", () => {
    const weekend = { date: "2026-10-17", expectedMinutes: 0 };
    const { container, rerender } = render(renderDay([], weekend));
    expect(container.firstChild).toHaveClass("bg-stripes-weekend");

    rerender(renderDay([entry], weekend));

    expect(container.firstChild).toHaveClass("bg-stripes-extra");
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("offers no new entry on a day that hasn't happened, but its entries still open", () => {
    render(renderDay([entry], { canLogTime: false }));

    expect(
      screen.queryByRole("button", { name: /^Log time on/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^1h 30m/ })).toBeInTheDocument();
  });
});
