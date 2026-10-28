import { ComponentProps } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Absence, TeamSummaryRow } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";
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
    deactivatedAt: null,
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

const renderRow = (
  rowValue: TeamSummaryRow,
  props: Partial<ComponentProps<typeof TeamWeekRow>> = {},
) => {
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
          isEditable={() => true}
          canWrite
          isHighlighted={false}
          onEditEntry={vi.fn()}
          onAdd={vi.fn()}
          onAbsenceClick={vi.fn()}
          onAddAbsence={vi.fn()}
          {...props}
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
    const { personCell, bar } = renderRow(row(), { projectName: "CRM System" });

    expect(within(personCell).getByText("on CRM System")).toBeInTheDocument();
    expect(within(personCell).queryByText("of 40h")).not.toBeInTheDocument();
    expect(bar).not.toBeInTheDocument();
  });

  it("gives every day of the week a cell", () => {
    renderRow(row());

    expect(screen.getAllByRole("cell")).toHaveLength(7);
  });

  it("records an absence from the Person cell", () => {
    const onAddAbsence = vi.fn();
    renderRow(row(), { onAddAbsence });

    fireEvent.click(
      screen.getByRole("button", { name: "Add an absence for Alice Cooper" }),
    );
    expect(onAddAbsence).toHaveBeenCalled();
  });

  it("writes for a deactivated person only on the days before they left", () => {
    const onAdd = vi.fn();
    renderRow(
      row({
        user: {
          ...row().user,
          status: UserStatus.DEACTIVATED,
          // Left on Thursday, where the company is.
          deactivatedAt: "2026-11-05T10:00:00Z",
        },
      }),
      { timezone: "Europe/Kyiv", onAdd },
    );

    const addButtons = screen.getAllByRole("button", { name: /^Log time/ });
    // Monday to Wednesday; from Thursday on they were gone.
    expect(addButtons).toHaveLength(3);
    fireEvent.click(addButtons[2]);
    expect(onAdd).toHaveBeenCalledWith(WEEK_DATES[2]);
    expect(
      screen.getByRole("button", { name: "Add an absence for Alice Cooper" }),
    ).toBeInTheDocument();
  });

  it("offers nothing to write without access", () => {
    renderRow(row(), { canWrite: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("logs time only on a day that has happened and is not locked", () => {
    const onAdd = vi.fn();
    renderRow(row(), {
      todayIso: "2026-11-04",
      // Monday is in a locked month.
      isEditable: (date) => date !== "2026-11-02",
      onAdd,
    });

    const addButtons = screen.getAllByRole("button", { name: /^Log time/ });
    // Tuesday and Wednesday: Monday is locked, Thursday on is still to come.
    expect(addButtons).toHaveLength(2);

    fireEvent.click(addButtons[0]);
    expect(onAdd).toHaveBeenCalledWith(WEEK_DATES[1]);
  });

  it("opens an absence in a locked month, to be read", () => {
    const vacation = {
      id: "absence-1",
      userId: "user-alice",
      type: AbsenceType.VACATION,
      startDate: "2026-11-02",
      endDate: "2026-11-02",
    } as Absence;
    const onAbsenceClick = vi.fn();

    renderRow(row(), {
      absencesByDate: { "2026-11-02": vacation },
      // November is locked, so nothing in the week can be written.
      isLocked: (date) => date.startsWith("2026-11"),
      isEditable: () => false,
      onAbsenceClick,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Vacation, open the absence" }),
    );
    expect(onAbsenceClick).toHaveBeenCalledWith(vacation);
  });

  it("marks the highlighted row and scrolls to it", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderRow(row(), { isHighlighted: true });

    expect(screen.getByRole("row")).toHaveClass("bg-brand-subtle");
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
