import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, PlanningWeekRow as Row } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";
import { getWeekDates } from "@/lib/utils/date";
import { getProjectColor } from "@/lib/utils/project-colors";

import { PlanningWeekRow } from "./PlanningWeekRow";

const WEEK_DATES = getWeekDates(new Date("2026-11-02T00:00:00"));

const NORTHWIND_MONDAY = {
  id: "plan-1",
  userId: "user-alice",
  project: { id: "project-northwind", name: "Northwind" },
  plannedMinutes: 240,
  date: "2026-11-02",
} as PlanningEntry;

const row = (
  status = UserStatus.ACTIVE,
  entries: PlanningEntry[] = [],
): Row => ({
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status,
    deactivatedAt: null,
  },
  plannedMinutes: entries.reduce((sum, entry) => sum + entry.plannedMinutes, 0),
  availableMinutes: 2400,
  projects: [],
  entries,
});

const WEEKEND_VACATION = {
  id: "absence-1",
  userId: "user-alice",
  type: AbsenceType.VACATION,
  startDate: "2026-11-07",
  endDate: "2026-11-08",
} as Absence;

const renderRow = (
  status?: UserStatus,
  entries?: PlanningEntry[],
  absencesByDate: Record<string, Absence> = {},
) => {
  const onPlanPeriod = vi.fn();
  const onOpenDay = vi.fn();
  const view = render(
    <table>
      <tbody>
        <PlanningWeekRow
          row={row(status, entries)}
          weekDates={WEEK_DATES}
          absencesByDate={absencesByDate}
          isLocked={() => false}
          isEditable={() => true}
          onOpenDay={onOpenDay}
          onPlanPeriod={onPlanPeriod}
        />
      </tbody>
    </table>,
  );
  return { ...view, onPlanPeriod, onOpenDay };
};

describe("PlanningWeekRow", () => {
  it("plans a period from the person's cell, which says so", async () => {
    const user = userEvent.setup();
    const { onPlanPeriod } = renderRow();

    const cell = screen.getByRole("button", {
      name: "Plan a period for Alice Cooper",
    });
    expect(cell).toHaveTextContent("Plan period");

    await user.click(cell);
    expect(onPlanPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: "user-alice" }),
      }),
    );
  });

  it("names a day cell by its day and contents", async () => {
    const user = userEvent.setup();
    const { onOpenDay } = renderRow(UserStatus.ACTIVE, [NORTHWIND_MONDAY]);

    const monday = screen.getByRole("button", {
      name: /^Monday, November 2:\s*Northwind\s*4h$/,
    });
    await user.click(monday);
    expect(onOpenDay).toHaveBeenCalledWith(expect.anything(), "2026-11-02");

    expect(
      screen.getByRole("button", {
        name: /^Tuesday, November 3:\s*nothing planned$/,
      }),
    ).toBeInTheDocument();
  });

  it("draws each plan as a chip in its project's colour", () => {
    renderRow(UserStatus.ACTIVE, [NORTHWIND_MONDAY]);

    expect(screen.getByText("Northwind").parentElement).toHaveStyle({
      backgroundColor: getProjectColor("project-northwind"),
    });
  });

  it("shows an absence on a weekend in the day-off stripes, and a plain weekend in the weekend stripes", () => {
    renderRow(UserStatus.ACTIVE, [], {
      "2026-11-07": WEEKEND_VACATION,
    });

    const saturday = screen.getByText("Vacation").closest("td");
    expect(saturday).toHaveClass("bg-stripes-day-off");
    expect(within(saturday!).queryByRole("button")).not.toBeInTheDocument();

    const sunday = screen.getAllByRole("cell").at(-2);
    expect(sunday).toHaveTextContent("-");
    expect(sunday).toHaveClass("bg-stripes-weekend");
  });

  it("shows the plus on an empty day without hovering", () => {
    const { container } = renderRow();

    const plus = container.querySelector("svg.lucide-plus");
    expect(plus).not.toBeNull();
    expect(plus).not.toHaveClass("opacity-0");
  });

  it("shows planned against available and nothing else", () => {
    renderRow(UserStatus.ACTIVE, [NORTHWIND_MONDAY]);

    expect(screen.getByText("/ 40h")).toBeInTheDocument();
    expect(screen.queryByText(/free/)).not.toBeInTheDocument();
  });

  it("marks a deactivated person and keeps their row read-only", () => {
    renderRow(UserStatus.DEACTIVATED, [NORTHWIND_MONDAY]);

    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
