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
  days: [
    {
      date: "2026-11-02",
      minutes: 480,
      billableMinutes: 480,
      nonBillableMinutes: 0,
    },
  ],
});

const renderRow = (status?: UserStatus) =>
  render(
    <table>
      <tbody>
        <TeamWeekRow
          row={row(status)}
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

  it("marks nobody who is active", () => {
    renderRow();

    expect(screen.queryByText("Deactivated")).not.toBeInTheDocument();
  });

  it("stripes an absence and leaves a weekend flat", () => {
    renderRow();

    expect(screen.getByText("Sick").closest("td")).toHaveClass(
      "bg-stripes-brand",
    );

    const [, , , , , saturday, sunday] = screen.getAllByRole("cell");
    expect(saturday).toHaveClass("bg-muted/20");
    expect(sunday).toHaveClass("bg-muted/20");
    expect(sunday).not.toHaveClass("bg-stripes-brand");
  });
});
