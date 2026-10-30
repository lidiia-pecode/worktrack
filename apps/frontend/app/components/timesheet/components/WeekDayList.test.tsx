import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, ProjectActivity, TimeLog } from "@/types";
import { AbsenceType } from "@/types/enums";

import { TimesheetDay } from "../helpers/day-state";
import { WeekDayList } from "./WeekDayList";

const entry: TimeLog = {
  id: "log-1",
  userId: "user-1",
  isBillable: false,
  minutes: 90,
  note: "Sprint review",
  date: "2026-10-14",
  createdAt: "2026-10-14T09:00:00Z",
  updatedAt: "2026-10-14T09:00:00Z",
  projectActivity: {
    project: { id: "project-atlas", name: "Atlas" },
    activity: { name: "Design" },
  } as ProjectActivity,
};

const plan = {
  id: "plan-1",
  userId: "user-1",
  project: { id: "project-beacon", name: "Beacon" },
  plannedMinutes: 240,
  date: "2026-10-14",
} as PlanningEntry;

const day = (overrides: Partial<TimesheetDay> = {}): TimesheetDay => ({
  date: new Date("2026-10-14T00:00:00"),
  timelogs: [],
  plannedEntries: [],
  isAbsenceLocked: false,
  totalMinutes: 0,
  expectedMinutes: 480,
  isLocked: false,
  isEditable: true,
  canLogTime: true,
  ...overrides,
});

const renderList = (days: TimesheetDay[]) => {
  const handlers = {
    onAddClick: vi.fn(),
    onAbsenceClick: vi.fn(),
    onEntryClick: vi.fn(),
  };
  render(<WeekDayList days={days} todayIso="2026-10-16" {...handlers} />);
  return handlers;
};

describe("WeekDayList", () => {
  it("shows an entry's details in its row, and opens it or a new entry", async () => {
    const user = userEvent.setup();
    const { onAddClick, onEntryClick } = renderList([
      day({ timelogs: [entry], totalMinutes: 90 }),
    ]);

    const row = screen.getByRole("button", { name: /Atlas · Design/ });
    expect(row).toHaveTextContent("Sprint review");
    expect(row).toHaveTextContent("Non-billable");

    await user.click(row);
    expect(onEntryClick).toHaveBeenCalledWith(entry);

    await user.click(screen.getByRole("button", { name: /^Log time on/ }));
    expect(onAddClick).toHaveBeenCalledWith(expect.any(Date));
  });

  it("logs time on a plan's project on a day with nothing logged", async () => {
    const user = userEvent.setup();
    const { onAddClick } = renderList([day({ plannedEntries: [plan] })]);

    await user.click(screen.getByRole("button", { name: /for Beacon/ }));

    expect(onAddClick).toHaveBeenCalledWith(expect.any(Date), "project-beacon");
  });

  it("shows a locked day's entries without opening them, and offers no new entry", () => {
    renderList([
      day({
        timelogs: [entry],
        totalMinutes: 90,
        isLocked: true,
        isEditable: false,
      }),
    ]);

    expect(screen.getByText(/Atlas · Design/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a plan without opening it on a day that hasn't happened", () => {
    renderList([day({ plannedEntries: [plan], canLogTime: false })]);

    expect(screen.getByText(/Beacon · planned/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens a locked absence to read", async () => {
    const user = userEvent.setup();
    const { onAbsenceClick } = renderList([
      day({
        absence: {
          id: "absence-1",
          type: AbsenceType.SICK_LEAVE,
          startDate: "2026-09-30",
          endDate: "2026-10-14",
        } as Absence,
        isAbsenceLocked: true,
        isEditable: false,
      }),
    ]);

    await user.click(
      screen.getByRole("button", { name: /^View the absence on/ }),
    );
    expect(onAbsenceClick).toHaveBeenCalled();
  });
});
