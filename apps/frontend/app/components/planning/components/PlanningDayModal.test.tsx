import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, PlanningWeekRow } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";

import { PlanningDayModal } from "./PlanningDayModal";

vi.mock("@/hooks/usePlanning", () => ({
  usePlanningMutations: () => ({
    create: { mutateAsync: vi.fn(), isPending: false },
    update: { mutateAsync: vi.fn(), isPending: false },
    delete: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

const NORTHWIND = {
  id: "plan-1",
  userId: "user-alice",
  project: { id: "project-northwind", name: "Northwind" },
  plannedMinutes: 240,
  date: "2026-11-10",
} as PlanningEntry;

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
  projects: [
    { id: "project-northwind", name: "Northwind" },
    { id: "project-internal", name: "Internal" },
  ],
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
  entries?: PlanningEntry[];
}) => {
  const onAddAbsence = vi.fn();
  const onClose = vi.fn();
  render(
    <PlanningDayModal
      row={{ ...ALICE, entries: props.entries ?? [] }}
      date="2026-11-10"
      dayLimitMinutes={480}
      absence={props.absence}
      onAddAbsence={onAddAbsence}
      onClose={onClose}
    />,
  );
  return { onAddAbsence, onClose };
};

const makeDirty = (user: ReturnType<typeof userEvent.setup>) =>
  user.type(screen.getByLabelText("Note"), "x");

// The dialog's × is also named "Close"; the footer's button comes first.
const footerClose = () => screen.getAllByRole("button", { name: "Close" })[0];

describe("PlanningDayModal", () => {
  it("shows a frozen absence instead of the form", () => {
    renderModal({ absence: VACATION });

    expect(screen.getByText("Vacation")).toBeInTheDocument();
    expect(screen.getByText("Skiing")).toBeInTheDocument();
    expect(screen.getByText(/touches a locked month/)).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Project" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add plan" }),
    ).not.toBeInTheDocument();
  });

  it("offers to add an absence on a working day", async () => {
    const user = userEvent.setup();
    const { onAddAbsence } = renderModal({});

    expect(
      screen.getByRole("combobox", { name: "Project" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/of an 8h day planned/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add absence" }));
    expect(onAddAbsence).toHaveBeenCalledOnce();
  });

  it("asks before Close drops unsaved changes", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({});

    await makeDirty(user);
    await user.click(footerClose());
    expect(screen.getByText("Discard your changes?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(footerClose());
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks before switching to another plan drops unsaved changes", async () => {
    const user = userEvent.setup();
    renderModal({ entries: [NORTHWIND] });

    await makeDirty(user);
    await user.click(screen.getByRole("button", { name: "Edit Northwind" }));
    expect(screen.getByText("Discard your changes?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });
});
