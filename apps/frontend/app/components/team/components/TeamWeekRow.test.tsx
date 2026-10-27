import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeamSummaryRow } from "@/types";
import { UserStatus } from "@/types/enums";
import { getWeekDates } from "@/lib/utils/date";

import { TeamWeekRow } from "./TeamWeekRow";

const WEEK_DATES = getWeekDates(new Date("2026-11-02T00:00:00"));

const row = (overrides: Partial<TeamSummaryRow> = {}): TeamSummaryRow => ({
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status: UserStatus.ACTIVE,
  },
  minutes: 1920,
  billableMinutes: 1920,
  nonBillableMinutes: 0,
  expectedMinutes: 2400,
  expectedToDateMinutes: 2400,
  expectedByDate: [],
  days: [],
  ...overrides,
});

const renderRow = (rowValue: TeamSummaryRow, projectName?: string) => {
  const { container } = render(
    <table>
      <tbody>
        <TeamWeekRow
          row={rowValue}
          weekDates={WEEK_DATES}
          todayIso="2026-11-09"
          absencesByDate={{}}
          plansByDate={{}}
          isLocked={() => false}
          projectName={projectName}
        />
      </tbody>
    </table>,
  );

  return {
    personCell: screen.getByRole("rowheader"),
    bar: container.querySelector(".bg-report-track"),
  };
};

describe("TeamWeekRow", () => {
  it("shows the person, their week against expected and the bar", () => {
    const { personCell, bar } = renderRow(row());

    expect(within(personCell).getByText("Alice Cooper")).toBeInTheDocument();
    expect(within(personCell).getByText("Designer")).toBeInTheDocument();
    expect(within(personCell).getByText("32h")).toHaveClass("text-foreground");
    expect(within(personCell).getByText("of 40h")).toBeInTheDocument();
    expect(bar).toBeInTheDocument();
    expect(screen.queryByText("Deactivated")).not.toBeInTheDocument();
  });

  it("turns the figure amber past what was expected", () => {
    const { personCell } = renderRow(
      row({ minutes: 2700, billableMinutes: 2700 }),
    );

    expect(within(personCell).getByText("45h")).toHaveClass(
      "text-warning-text",
    );
  });

  it("names the project under a project filter, with no bar", () => {
    const { personCell, bar } = renderRow(row(), "CRM System");

    expect(within(personCell).getByText("on CRM System")).toBeInTheDocument();
    expect(within(personCell).queryByText("of 40h")).not.toBeInTheDocument();
    expect(bar).not.toBeInTheDocument();
  });

  it("marks a deactivated person, who is expected nothing", () => {
    const { personCell, bar } = renderRow(
      row({
        user: { ...row().user, status: UserStatus.DEACTIVATED },
        minutes: 0,
        billableMinutes: 0,
      }),
    );

    expect(within(personCell).getByText("Deactivated")).toBeInTheDocument();
    expect(
      within(personCell).getByText("nothing expected"),
    ).toBeInTheDocument();
    expect(bar).not.toBeInTheDocument();
  });

  it("gives every day of the week a cell", () => {
    renderRow(row());

    expect(screen.getAllByRole("cell")).toHaveLength(7);
  });
});
