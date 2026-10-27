import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry } from "@/types";
import { AbsenceType } from "@/types/enums";
import { formatAbsenceRange } from "@/lib/utils/absence";

import { AbsenceFormModal, LockedAbsenceModal } from "./AbsenceFormModal";

const data = vi.hoisted(() => ({ plans: [] as PlanningEntry[] }));

vi.mock("@/hooks/usePlanning", () => ({
  usePlanningEntries: () => ({
    items: data.plans,
    isLoading: false,
    isError: false,
  }),
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
  });

  it("names the plans the absence will remove", () => {
    data.plans = [
      plan("plan-1", "Northwind", 240),
      plan("plan-2", "Internal", 120),
    ];

    renderForm();

    expect(
      screen.getByText(
        "Removes 2 plans on these days: Northwind 4h, Internal 2h",
      ),
    ).toBeInTheDocument();
  });

  it("names whose absence it is, when given", () => {
    renderForm("Alice Cooper");

    expect(screen.getByRole("dialog")).toHaveTextContent("Alice Cooper");
  });

  it("says nothing when there is no plan on those days", () => {
    renderForm();

    expect(screen.queryByText(/^Removes/)).not.toBeInTheDocument();
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
    expect(screen.getByText(formatAbsenceRange(absence))).toBeInTheDocument();
    expect(screen.getByText(/Family trip to the coast/)).toBeInTheDocument();
    expect(screen.getByText(/in a locked month/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Save|Delete/ }),
    ).not.toBeInTheDocument();
  });
});
