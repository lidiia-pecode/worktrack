import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, TeamSummaryRow, TimeLog } from "@/types";
import { AbsenceType, UserStatus } from "@/types/enums";
import { formatAbsenceRange } from "@/lib/utils/absence";
import { getWeekDates } from "@/lib/utils/date";

import { PersonWeekPanel } from "./PersonWeekPanel";

// What the hooks answer; each test sets what it needs.
const data = vi.hoisted(() => ({
  timelogs: [] as TimeLog[],
  plannedEntries: [] as PlanningEntry[],
}));

const noop = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/useTimelogs", () => ({
  useTimelogs: () => ({
    items: data.timelogs,
    actions: { create: noop, update: noop, delete: noop },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAssignableActivities", () => ({
  useAssignableActivities: () => ({
    items: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAbsences", () => ({
  useAbsencesMutations: () => ({ create: noop, update: noop, delete: noop }),
}));

vi.mock("@/hooks/usePlanning", () => ({
  usePlanningEntries: () => ({
    items: data.plannedEntries,
    isLoading: false,
    isError: false,
  }),
}));

// jsdom has no matchMedia; the panel renders as the desktop `aside`.
vi.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: () => true }));

// The form itself is tested on its own; here only that it opens matters.
vi.mock("../../timesheet/components/TimeLogFormModal", () => ({
  TimeLogFormModal: () => <div role="dialog" aria-label="Time entry form" />,
}));

vi.mock("../../timesheet/components/AbsenceFormModal", () => ({
  AbsenceFormModal: ({ absence }: { absence?: Absence }) => (
    <div role="dialog" aria-label="Absence form">
      {absence ? `Editing ${absence.id}` : "New absence"}
    </div>
  ),
}));

const WEEK_DATES = getWeekDates(new Date("2026-10-19T00:00:00"));

const row = (status = UserStatus.ACTIVE): TeamSummaryRow => ({
  user: {
    id: "user-1",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
    position: "Product Designer",
    status,
  },
  minutes: 240,
  billableMinutes: 240,
  nonBillableMinutes: 0,
  expectedMinutes: 2400,
  expectedToDateMinutes: 960,
  days: [],
});

const entry: TimeLog = {
  id: "log-1",
  userId: "user-1",
  isBillable: true,
  minutes: 240,
  date: "2026-10-19",
  createdAt: "2026-10-19T09:00:00Z",
  updatedAt: "2026-10-19T09:00:00Z",
  projectActivity: {
    id: "pair-1",
    companyId: "company-1",
    projectId: "project-1",
    activityId: "activity-1",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    project: { id: "project-1", name: "Website redesign", status: "ACTIVE" },
    activity: {
      id: "activity-1",
      companyId: "company-1",
      name: "Design",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  },
} as TimeLog;

const vacation: Absence = {
  id: "absence-1",
  userId: "user-1",
  type: AbsenceType.VACATION,
  startDate: "2026-10-21",
  endDate: "2026-10-22",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const plan = {
  id: "plan-1",
  userId: "user-1",
  project: { id: "project-1", name: "Website redesign" },
  plannedMinutes: 360,
  date: "2026-10-23",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
} as PlanningEntry;

const renderPanel = ({
  status = UserStatus.ACTIVE,
  absencesByDate = {},
  isLocked = () => false,
}: {
  status?: UserStatus;
  absencesByDate?: Record<string, Absence>;
  isLocked?: (date: string) => boolean;
} = {}) =>
  render(
    <PersonWeekPanel
      row={row(status)}
      viewerId="viewer-1"
      weekDates={WEEK_DATES}
      weekLabel="19 Oct – 25 Oct, 2026"
      todayIso="2026-10-20"
      canWrite
      isLocked={isLocked}
      isEditable={(date) => !isLocked(date)}
      absencesByDate={absencesByDate}
      onClose={vi.fn()}
    />,
  );

const dayOf = (weekday: string) =>
  screen.getByRole("heading", { level: 3, name: new RegExp(weekday) })
    .parentElement!.parentElement!;

const addButtons = () =>
  screen.queryAllByRole("button", { name: /Log time on/ });

describe("PersonWeekPanel", () => {
  beforeEach(() => {
    data.timelogs = [];
    data.plannedEntries = [];
  });

  it("shows an absence with its type and range, and offers no entry on that day", () => {
    renderPanel({
      absencesByDate: { "2026-10-21": vacation, "2026-10-22": vacation },
    });

    const wednesday = dayOf("Wed");
    expect(within(wednesday).getByText("Vacation")).toBeInTheDocument();
    expect(
      within(wednesday).getByText(formatAbsenceRange(vacation)),
    ).toBeInTheDocument();
    expect(
      within(wednesday).queryByRole("button", { name: /Log time on/ }),
    ).not.toBeInTheDocument();

    // The other five days still take an entry.
    expect(addButtons()).toHaveLength(5);
  });

  it("shows the day's plan where nothing is logged", () => {
    data.plannedEntries = [plan];

    renderPanel();

    const friday = dayOf("Fri");
    expect(within(friday).getByText("Planned")).toBeInTheDocument();
    expect(
      within(friday).getByText("Website redesign · 6h"),
    ).toBeInTheDocument();
  });

  it("opens the absence form for the person from the header and from an absence day", async () => {
    const user = userEvent.setup();
    renderPanel({ absencesByDate: { "2026-10-21": vacation } });

    await user.click(screen.getByRole("button", { name: "Add absence" }));
    expect(
      screen.getByRole("dialog", { name: "Absence form" }),
    ).toHaveTextContent("New absence");

    await user.click(
      within(dayOf("Wed")).getByRole("button", { name: /Vacation/ }),
    );
    expect(
      screen.getByRole("dialog", { name: "Absence form" }),
    ).toHaveTextContent("Editing absence-1");
  });

  it("shows a locked absence but does not open it", () => {
    const fromSeptember = { ...vacation, startDate: "2026-09-28" };
    renderPanel({
      absencesByDate: { "2026-10-21": fromSeptember },
      isLocked: (date) => date < "2026-10-01",
    });

    const wednesday = dayOf("Wed");
    expect(within(wednesday).getByText("Vacation")).toBeInTheDocument();
    expect(
      within(wednesday).getByText("Part of it is in a locked month"),
    ).toBeInTheDocument();
    expect(
      within(wednesday).queryByRole("button", { name: /Vacation/ }),
    ).not.toBeInTheDocument();
  });

  it("marks a deactivated person and lets nobody add or edit their entries", () => {
    data.timelogs = [entry];

    renderPanel({ status: UserStatus.DEACTIVATED });

    expect(screen.getByText("Deactivated")).toBeInTheDocument();
    expect(addButtons()).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Add absence" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Website redesign")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Website redesign/ }),
    ).not.toBeInTheDocument();
  });

  it("asks before logging time on a weekend, then opens the form", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      within(dayOf("Sat")).getByRole("button", { name: /Log time on/ }),
    );

    expect(
      screen.getByRole("dialog", { name: "Log time on a non-work day?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Time entry form" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log time" }));

    expect(
      screen.getByRole("dialog", { name: "Time entry form" }),
    ).toBeInTheDocument();
  });

  it("opens the form straight away on a working day", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      within(dayOf("Tue")).getByRole("button", { name: /Log time on/ }),
    );

    expect(
      screen.getByRole("dialog", { name: "Time entry form" }),
    ).toBeInTheDocument();
  });
});
