import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Absence, TeamSummaryRow } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";
import { getWeekDates } from "@/lib/utils/date";

import { TeamWeekRow } from "./TeamWeekRow";

const WEEK_DATES = getWeekDates(new Date("2026-11-02T00:00:00"));

const SICK_TUESDAY = {
  id: "absence-1",
  userId: "user-alice",
  type: AbsenceType.SICK_LEAVE,
  startDate: "2026-11-03",
  endDate: "2026-11-03",
} as Absence;

const row = (status = UserStatus.ACTIVE): TeamSummaryRow => ({
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status,
  },
  minutes: 480,
  billableMinutes: 480,
  nonBillableMinutes: 0,
  expectedMinutes: 2400,
  expectedToDateMinutes: 2400,
  expectedByDate: [],
  days: [
    {
      date: "2026-11-02",
      minutes: 480,
      billableMinutes: 480,
      nonBillableMinutes: 0,
    },
  ],
});

const renderRow = (status?: UserStatus, rowValue = row(status)) =>
  render(
    <table>
      <tbody>
        <TeamWeekRow
          row={rowValue}
          weekDates={WEEK_DATES}
          absencesByDate={{ "2026-11-03": SICK_TUESDAY }}
          showsExpected
          onOpen={vi.fn()}
        />
      </tbody>
    </table>,
  );

describe("TeamWeekRow", () => {
  it("marks a deactivated person", () => {
    renderRow(UserStatus.DEACTIVATED);

    expect(screen.getByText("Deactivated")).toBeInTheDocument();
  });

  it("names an empty day for a screen reader, and opens the person from the keyboard", () => {
    renderRow();

    // Monday has time and Tuesday an absence: five days are empty.
    expect(screen.getAllByText("No time")).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Open Alice Cooper's entries" }),
    ).toBeInTheDocument();
  });

  it("marks nobody who is active", () => {
    renderRow();

    expect(screen.queryByText("Deactivated")).not.toBeInTheDocument();
  });

  it("stripes a day off and a weekend, each in its own colour", () => {
    renderRow();

    expect(screen.getByText("Sick").closest("td")).toHaveClass(
      "bg-stripes-day-off",
    );

    const [, , , , , saturday, sunday] = screen.getAllByRole("cell");
    expect(saturday).toHaveClass("bg-stripes-weekend");
    expect(sunday).toHaveClass("bg-stripes-weekend");
  });

  it("marks a day over the person's hours, and a weekend with time, as extra", () => {
    const day = (date: string, minutes: number) => ({
      date,
      minutes,
      billableMinutes: 0,
      nonBillableMinutes: minutes,
    });
    renderRow(UserStatus.ACTIVE, {
      ...row(),
      expectedByDate: [
        { date: "2026-11-02", minutes: 480 },
        { date: "2026-11-04", minutes: 480 },
      ],
      days: [
        day("2026-11-02", 600),
        day("2026-11-04", 480),
        day("2026-11-07", 120),
      ],
    });

    const [monday, , wednesday, , , saturday] = screen.getAllByRole("cell");
    expect(monday).toHaveClass("bg-excess");
    expect(screen.getByText("10h")).toHaveClass("text-warning-text");
    expect(wednesday).not.toHaveClass("bg-excess");
    expect(saturday).toHaveClass("bg-stripes-extra");
  });
});
