import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Absence, PlanningWeekRow } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";

import { PlanningDayModal } from "./PlanningDayModal";

vi.mock("@/hooks/usePlanning", () => ({
  usePlanningMutations: () => ({
    create: { mutateAsync: vi.fn(), isPending: false },
    update: { mutateAsync: vi.fn(), isPending: false },
    delete: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

const ALICE: PlanningWeekRow = {
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status: UserStatus.ACTIVE,
  },
  plannedMinutes: 0,
  availableMinutes: 2400,
  projects: [{ id: "project-northwind", name: "Northwind" }],
  entries: [],
};

const VACATION: Absence = {
  id: "absence-1",
  userId: "user-alice",
  type: AbsenceType.VACATION,
  startDate: "2026-11-09",
  endDate: "2026-11-13",
  note: "Skiing",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const renderModal = (props: {
  absence?: Absence;
  canEditAbsence?: boolean;
}) => {
  const onAddAbsence = vi.fn();
  const onEditAbsence = vi.fn();
  render(
    <PlanningDayModal
      row={ALICE}
      date="2026-11-10"
      dayLimitMinutes={480}
      absence={props.absence}
      canEditAbsence={props.canEditAbsence ?? true}
      onAddAbsence={onAddAbsence}
      onEditAbsence={onEditAbsence}
      onClose={vi.fn()}
    />,
  );
  return { onAddAbsence, onEditAbsence };
};

describe("PlanningDayModal", () => {
  it("shows an absence day's absence instead of the form", async () => {
    const user = userEvent.setup();
    const { onEditAbsence } = renderModal({ absence: VACATION });

    expect(screen.getByText("Vacation")).toBeInTheDocument();
    expect(screen.getByText("Skiing")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Project" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add plan" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit absence" }));
    expect(onEditAbsence).toHaveBeenCalledWith(VACATION);
  });

  it("explains a locked absence instead of offering to edit it", () => {
    renderModal({ absence: VACATION, canEditAbsence: false });

    expect(
      screen.queryByRole("button", { name: "Edit absence" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/touches a locked month/)).toBeInTheDocument();
  });

  it("offers to add an absence on a working day", async () => {
    const user = userEvent.setup();
    const { onAddAbsence } = renderModal({});

    expect(
      screen.getByRole("combobox", { name: "Project" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add absence" }));
    expect(onAddAbsence).toHaveBeenCalledOnce();
  });
});
