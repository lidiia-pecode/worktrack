import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, PlanningWeekRow } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";

import { PlanningDayModal } from "./PlanningDayModal";

const server = vi.hoisted(() => ({ planPeriod: vi.fn() }));

vi.mock("@/hooks/usePlanning", () => ({
  usePlanPeriod: () => ({ mutateAsync: server.planPeriod, isPending: false }),
  usePlanningMutations: () => ({
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
    deactivatedAt: null,
  },
  plannedMinutes: 0,
  availableMinutes: 2400,
  dayLimits: [{ date: "2026-11-10", minutes: 480 }],
  projects: [
    { id: "project-northwind", name: "Northwind" },
    { id: "project-internal", name: "Internal" },
  ],
  entries: [],
  closedSpells: [],
  moves: [],
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
      row={{
        ...ALICE,
        entries: props.entries ?? [],
        plannedMinutes: (props.entries ?? []).reduce(
          (total, entry) => total + entry.plannedMinutes,
          0,
        ),
      }}
      date="2026-11-10"
      absence={props.absence}
      onAddAbsence={onAddAbsence}
      onClose={onClose}
    />,
  );
  return { onAddAbsence, onClose };
};

type User = ReturnType<typeof userEvent.setup>;

// The dialog moves its focus inside once open; typing before that is lost.
const dialogSettled = () =>
  waitFor(() => expect(document.activeElement).not.toBe(document.body));

const setHours = async (user: User, group: string, hours: string) => {
  await dialogSettled();
  const field = within(screen.getByRole("group", { name: group })).getByRole(
    "spinbutton",
    { name: "Hours" },
  );
  await user.clear(field);
  await user.type(field, hours);
  await user.tab();
};

const saveButton = () => screen.getByRole("button", { name: "Save plan" });

describe("PlanningDayModal", () => {
  beforeEach(() => {
    server.planPeriod.mockReset().mockResolvedValue({});
  });

  it("shows a frozen absence instead of the form", () => {
    renderModal({ absence: VACATION });

    expect(screen.getByText("Vacation")).toBeInTheDocument();
    expect(screen.getByText("Skiing")).toBeInTheDocument();
    expect(screen.getByText(/touches a locked month/)).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Project 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save plan" }),
    ).not.toBeInTheDocument();
  });

  it("offers to add an absence on a working day, and sums the day up", async () => {
    const user = userEvent.setup();
    const { onAddAbsence } = renderModal({ entries: [NORTHWIND] });

    expect(screen.getByText("4h planned")).toBeInTheDocument();
    expect(screen.getByText("8h working day")).toBeInTheDocument();
    expect(screen.getByText("Up to 4h fits on this day")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add absence" }));
    expect(onAddAbsence).toHaveBeenCalledOnce();
  });

  it("asks before Escape drops unsaved changes, and Cancel never asks", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({});

    await dialogSettled();
    await user.type(screen.getByLabelText("Note for project 1"), "x");
    await user.keyboard("{Escape}");
    expect(screen.getByText("Discard your changes?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("offers a new line only the projects not planned that day", async () => {
    const user = userEvent.setup();
    renderModal({ entries: [NORTHWIND] });

    await user.click(screen.getByRole("combobox", { name: "Project 1" }));
    expect(
      (await screen.findAllByRole("option")).map((o) => o.textContent),
    ).toEqual(["Internal"]);
  });

  it("saves the changed hours and the added plan as one day", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal({ entries: [NORTHWIND] });

    await setHours(user, "Hours for Northwind", "3");
    await user.click(screen.getByRole("combobox", { name: "Project 1" }));
    await user.click(await screen.findByRole("option", { name: "Internal" }));
    await setHours(user, "Hours for project 1", "2");

    expect(
      screen.getByText("change Northwind from 4h to 3h"),
    ).toBeInTheDocument();
    expect(screen.getByText("add Internal, 2h")).toBeInTheDocument();

    await user.click(saveButton());

    expect(server.planPeriod).toHaveBeenCalledWith({
      userId: "user-alice",
      startDate: "2026-11-10",
      endDate: "2026-11-10",
      projects: [
        {
          projectId: "project-northwind",
          minutesPerDay: 180,
          existingDaysOnly: true,
        },
        { projectId: "project-internal", minutesPerDay: 120 },
      ],
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks for hours or the bin when a plan is set to 0h, and does not save", async () => {
    const user = userEvent.setup();
    renderModal({ entries: [NORTHWIND] });

    await setHours(user, "Hours for Northwind", "0");

    expect(
      screen.getByText("Enter hours, or delete the plan"),
    ).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });
});
