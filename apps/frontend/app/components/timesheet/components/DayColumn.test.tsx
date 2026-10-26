import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlanningEntry, TimeLog } from "@/types";

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

const plan = (projectName: string, plannedMinutes: number) =>
  ({
    id: `plan-${projectName}`,
    userId: "user-1",
    project: { id: `project-${projectName}`, name: projectName },
    plannedMinutes,
    date: "2026-10-14",
  }) as PlanningEntry;

const renderDay = (
  timelogs: TimeLog[],
  {
    date = "2026-10-14",
    expectedMinutes = 480,
    canLogTime = true,
    plannedEntries = [] as PlanningEntry[],
    onAddClick = vi.fn(),
  } = {},
) => (
  <DayColumn
    date={new Date(`${date}T00:00:00`)}
    timelogs={timelogs}
    plannedEntries={plannedEntries}
    isAbsenceLocked={false}
    totalMinutes={timelogs.reduce((sum, log) => sum + log.minutes, 0)}
    pixelsPerMinute={1}
    expectedMinutes={expectedMinutes}
    isLocked={false}
    isEditable
    canLogTime={canLogTime}
    onAddClick={onAddClick}
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

  it("runs the excess fill from the day's line to the column's foot", () => {
    const { container } = render(renderDay([{ ...entry, minutes: 540 }]));

    expect(container.querySelector(".bg-excess")).toHaveStyle({
      top: "480px",
      bottom: "0px",
    });
  });

  describe("plans", () => {
    const plans = [plan("Atlas", 120), plan("Beacon", 240)];

    it("stacks each plan as a block on the day's scale", () => {
      render(renderDay([], { plannedEntries: plans }));

      const atlas = screen.getByRole("button", { name: /for Atlas/ });
      const beacon = screen.getByRole("button", { name: /for Beacon/ });
      expect(atlas).toHaveStyle({ height: "120px" });
      expect(beacon).toHaveStyle({ height: "240px" });
      expect(atlas).toHaveTextContent("2h planned");
    });

    it("logs time on a plan's project, and on none from the rest of the day", async () => {
      const user = userEvent.setup();
      const onAddClick = vi.fn();
      render(renderDay([], { plannedEntries: plans, onAddClick }));

      await user.click(screen.getByRole("button", { name: /for Beacon/ }));
      expect(onAddClick).toHaveBeenLastCalledWith(
        expect.any(Date),
        "project-Beacon",
      );

      // The day itself, named without a project.
      await user.click(
        screen.getByRole("button", { name: /^Log time on [^(]+$/ }),
      );
      expect(onAddClick).toHaveBeenLastCalledWith(expect.any(Date));
    });

    it("opens a plan once from the keyboard, not the day around it", async () => {
      const user = userEvent.setup();
      const onAddClick = vi.fn();
      render(renderDay([], { plannedEntries: plans, onAddClick }));

      screen.getByRole("button", { name: /for Atlas/ }).focus();
      await user.keyboard("{Enter}");

      expect(onAddClick).toHaveBeenCalledOnce();
      expect(onAddClick).toHaveBeenCalledWith(
        expect.any(Date),
        "project-Atlas",
      );
    });

    it("shows a plan without opening it on a day that hasn't happened", () => {
      render(renderDay([], { plannedEntries: plans, canLogTime: false }));

      expect(screen.getByText("Atlas")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /for Atlas/ }),
      ).not.toBeInTheDocument();
    });

    it("gives way to the record once time is logged", () => {
      render(renderDay([entry], { plannedEntries: plans }));

      expect(screen.queryByText("Atlas")).not.toBeInTheDocument();
    });
  });
});
