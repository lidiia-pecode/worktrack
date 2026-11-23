import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry } from "@/types";
import { AbsenceType } from "@/types/enums";
import { formatAbsenceRange } from "@/lib/utils/absence";

import { AbsenceFormModal, LockedAbsenceModal } from "./AbsenceFormModal";

const data = vi.hoisted(() => ({
  plans: [] as PlanningEntry[],
  isLoading: false,
  isError: false,
}));

vi.mock("@/hooks/usePlanning", () => ({
  usePlanningEntries: () => ({
    items: data.plans,
    isLoading: data.isLoading,
    isError: data.isError,
    isPlaceholderData: false,
    refetch: vi.fn(),
  }),
}));

// A whole-day form never reads a day's hours; no day nearby is taken.
vi.mock("@/hooks/useAbsences", () => ({
  useAbsenceDay: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useAbsencesMutations: vi.fn(),
  useAllAbsencesQuery: () => ({ items: [] }),
}));

vi.mock("@/hooks/useTimelogs", () => ({
  useAllTimeLogsQuery: () => ({ items: [] }),
}));

vi.mock("@/hooks/useReportingPeriods", () => ({
  useLockedDates: () => ({ isLocked: () => false }),
}));

const plan = (id: string, projectName: string, minutes: number) =>
  ({
    id,
    userId: "user-1",
    project: { id: `project-${projectName}`, name: projectName },
    plannedMinutes: minutes,
    date: "2026-11-13",
  }) as PlanningEntry;

const renderForm = (subjectName?: string) =>
  render(
    <AbsenceFormModal
      open
      onClose={vi.fn()}
      userId="user-1"
      subjectName={subjectName}
      date="2026-11-13"
      isLocked={() => false}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
      isSaving={false}
      isDeleting={false}
    />,
  );

describe("AbsenceFormModal", () => {
  beforeEach(() => {
    data.plans = [];
    data.isLoading = false;
    data.isError = false;
  });

  it("names the plans the absence will remove", () => {
    data.plans = [
      plan("plan-1", "Northwind", 240),
      plan("plan-2", "Internal", 120),
    ];

    renderForm();

    expect(
      screen.getByText(
        "Deletes 2 plans on this day: Northwind 4h, Internal 2h",
      ),
    ).toBeInTheDocument();
  });

  it("names whose absence it is, when given", () => {
    renderForm("Alice Cooper");

    expect(screen.getByRole("dialog")).toHaveTextContent("Alice Cooper");
  });

  it("says nothing when there is no plan on those days", () => {
    renderForm();

    expect(screen.queryByText(/^Deletes/)).not.toBeInTheDocument();
  });

  // Saving deletes the plans on those days, so it waits until they are known.
  it("can't save while the plans on those days load", () => {
    data.isLoading = true;

    renderForm();

    expect(screen.getByRole("button", { name: "Add absence" })).toBeDisabled();
  });

  it("can't save when those plans fail to load, and offers to try again", () => {
    data.isError = true;

    renderForm();

    expect(screen.getByRole("button", { name: "Add absence" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});

describe("LockedAbsenceModal", () => {
  it("shows the whole absence to read, with nothing to save or delete", () => {
    const absence = {
      id: "absence-1",
      userId: "user-1",
      type: AbsenceType.VACATION,
      startDate: "2026-09-28",
      endDate: "2026-10-02",
      note: "Family trip to the coast, back on Monday.\nCall if urgent.",
    } as Absence;

    render(<LockedAbsenceModal absence={absence} onClose={vi.fn()} />);

    expect(screen.getByText("Vacation")).toBeInTheDocument();
    // The days in the subtitle, as "Sep 28 – Oct 2", and in the body.
    expect(
      screen.getByRole("dialog", { name: "Absence" }),
    ).toHaveAccessibleDescription(formatAbsenceRange(absence));
    expect(screen.getAllByText(formatAbsenceRange(absence))).toHaveLength(2);
    expect(screen.getByText(/Family trip to the coast/)).toBeInTheDocument();
    expect(screen.getByText(/in a locked month/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Save|Delete/ }),
    ).not.toBeInTheDocument();
  });
});
