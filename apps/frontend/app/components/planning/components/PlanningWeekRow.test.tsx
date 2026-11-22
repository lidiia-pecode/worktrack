import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, PlanningRow as Row, TeamMove } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";
import { getWeekDates } from "@/lib/utils/date";
import { createTooltipHandle } from "@/components/ui/tooltip";

import { PlanningWeekRow } from "./PlanningWeekRow";

// The grid shows working days only, Monday 2 to Friday 6 November.
const WEEK_DATES = getWeekDates(new Date("2026-11-02T00:00:00")).slice(0, 5);

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
  moves: TeamMove[] = [],
): Row => ({
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status,
    lastWorkingDay: null,
  },
  plannedMinutes: entries.reduce((sum, entry) => sum + entry.plannedMinutes, 0),
  availableMinutes: 2400,
  availableByDay: [],
  // A full-time week: 8h on each working day.
  dayLimits: [
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06",
  ].map((date) => ({ date, minutes: 480 })),
  projects: [],
  entries,
  closedSpells: [],
  moves,
});

const renderRow = (
  status?: UserStatus,
  entries?: PlanningEntry[],
  absencesByDate: Record<string, Absence> = {},
  moves?: TeamMove[],
  isLocked: (date: string) => boolean = () => false,
) => {
  const onPlanPeriod = vi.fn();
  const onAbsenceClick = vi.fn();
  const view = render(
    <table>
      <tbody>
        <PlanningWeekRow
          row={row(status, entries, moves)}
          weekDates={WEEK_DATES}
          absencesByDate={absencesByDate}
          isLocked={isLocked}
          tooltip={createTooltipHandle<string>()}
          onPlanPeriod={onPlanPeriod}
          onAbsenceClick={onAbsenceClick}
        />
      </tbody>
    </table>,
  );
  return { ...view, onPlanPeriod, onAbsenceClick };
};

describe("PlanningWeekRow", () => {
  it("plans a period from the button beside the person", async () => {
    const user = userEvent.setup();
    const { onPlanPeriod } = renderRow();

    await user.click(
      screen.getByRole("button", { name: "Plan a period for Alice Cooper" }),
    );
    expect(onPlanPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: "user-alice" }),
      }),
    );
  });

  it("plans a period for someone who moved out this week, and no day opens anything", () => {
    renderRow(UserStatus.ACTIVE, [NORTHWIND_MONDAY], {}, [
      { date: "2026-11-04", direction: "out" },
    ]);

    expect(screen.getByText(/^Moved out/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toEqual([
      screen.getByRole("button", { name: "Plan a period for Alice Cooper" }),
    ]);
  });

  it("opens an absence from its days", async () => {
    const user = userEvent.setup();
    const vacation = {
      id: "absence-1",
      userId: "user-alice",
      type: AbsenceType.VACATION,
      startDate: "2026-11-03",
      endDate: "2026-11-04",
    } as Absence;
    const { onAbsenceClick } = renderRow(UserStatus.ACTIVE, [], {
      "2026-11-03": vacation,
      "2026-11-04": vacation,
    });

    await user.click(screen.getByRole("button", { name: /open the absence/ }));

    expect(onAbsenceClick).toHaveBeenCalledWith(vacation);
  });

  it("plans no period on a week wholly in a locked month", () => {
    renderRow(UserStatus.ACTIVE, [], {}, [], () => true);

    expect(
      screen.queryByRole("button", { name: "Plan a period for Alice Cooper" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Alice Cooper")).toBeInTheDocument();
  });

  it("marks a deactivated person and keeps their row read-only", () => {
    renderRow(UserStatus.DEACTIVATED, [NORTHWIND_MONDAY]);

    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(screen.getByText("Northwind")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
