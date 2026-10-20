import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanningEntry } from "@/types";

import { AbsenceFormModal } from "./AbsenceFormModal";

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

const renderForm = () =>
  render(
    <AbsenceFormModal
      open
      onClose={vi.fn()}
      userId="user-1"
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

  it("says nothing when there is no plan on those days", () => {
    renderForm();

    expect(screen.queryByText(/^Removes/)).not.toBeInTheDocument();
  });
});
