import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Absence,
  PeriodPreview,
  PlanningEntry,
  PlanningWeekRow,
} from "@/types";
import { AbsenceType, UserStatus, WeekDay } from "@/types/enums";
import {
  formatDayMonthLabel,
  formatDayMonthYearLabel,
  formatLongDayLabel,
  formatMonthLabel,
} from "@/lib/utils/date";

import { PlanPeriodModal } from "./PlanPeriodModal";

const server = vi.hoisted(() => ({
  planPeriod: vi.fn(),
  deletePeriodPlans: vi.fn(),
  preview: null as PeriodPreview | null,
  previewError: null as unknown,
  absences: [] as Absence[],
  plans: [] as PlanningEntry[],
}));

vi.mock("@/hooks/usePlanning", () => ({
  usePlanPeriod: () => ({ mutateAsync: server.planPeriod, isPending: false }),
  useDeletePeriodPlans: () => ({
    mutate: server.deletePeriodPlans,
    isPending: false,
  }),
  usePeriodPreview: () => ({
    preview: server.preview ?? undefined,
    isOutdated: false,
    error: server.previewError,
  }),
  usePlanningEntries: () => ({
    items: server.plans,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useAbsences", () => ({
  useAllAbsencesQuery: () => ({
    items: server.absences,
    isLoading: false,
    isError: false,
  }),
}));

// The company's today is 20 October 2026 in these tests.
vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({ weekStartDay: WeekDay.MONDAY, timezone: "UTC" }),
}));

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
  dayLimits: [{ date: "2026-10-12", minutes: 480 }],
  projects: [
    { id: "project-northwind", name: "Northwind" },
    { id: "project-internal", name: "Internal" },
  ],
  entries: [],
  closedSpells: [],
  moves: [],
};

const OCTOBER_DAYS = Array.from({ length: 22 }, (_, i) => {
  const day = new Date(2026, 9, 1 + i);
  return day;
})
  .filter((day) => day.getDay() !== 0 && day.getDay() !== 6)
  .map(
    (day) =>
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
  );

// Planning shows the week of Monday 19 October 2026, working days only.
const WEEK_DATES = [19, 20, 21, 22, 23].map((day) => new Date(2026, 9, day));

const renderModal = (row = ALICE) => {
  const onClose = vi.fn();
  render(
    <PlanPeriodModal
      row={row}
      weekDates={WEEK_DATES}
      onAddAbsence={vi.fn()}
      onClose={onClose}
    />,
  );
  return { onClose };
};

const weekLabel = (from: string, to: string) =>
  `${formatDayMonthLabel(from)} – ${formatDayMonthYearLabel(to)}`;

const isPressed = (name: string) =>
  screen.getByRole("button", { name }).getAttribute("aria-pressed");

type User = ReturnType<typeof userEvent.setup>;

const periodLabel = () =>
  screen.getByRole("button", { name: /\d{4}/ }).textContent ?? "";

const openCalendar = (user: User) =>
  user.click(screen.getByRole("button", { name: /\d{4}/ }));

// The day's own label, not another day whose label starts the same way.
const pickDay = (user: User, iso: string) =>
  user.click(
    screen.getByRole("button", {
      name: new RegExp(
        `^${formatLongDayLabel(new Date(`${iso}T00:00:00`))}(,|$)`,
      ),
    }),
  );

const pickOption = async (user: User, combobox: string, option: string) => {
  await user.click(screen.getByRole("combobox", { name: combobox }));
  await user.click(await screen.findByRole("option", { name: option }));
};

const fillRow = async (
  user: User,
  index: number,
  project: string,
  hours: string,
) => {
  await pickOption(user, `Project ${index + 1}`, project);
  const field = screen.getAllByRole("spinbutton", { name: "Hours" })[index];
  await user.clear(field);
  await user.type(field, hours);
  await user.tab();
};

describe("PlanPeriodModal", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date("2026-10-20T12:00:00Z"),
      toFake: ["Date"],
    });
    server.planPeriod.mockReset();
    server.deletePeriodPlans.mockReset();
    server.preview = {
      plannedDays: OCTOBER_DAYS,
      daysInAnotherTeam: [],
      problems: [],
      changes: [],
      dayLimitMinutes: 480,
    };
    server.previewError = null;
    server.absences = [];
    server.plans = [];
  });

  it("opens on the shown week, with its month a click away, and steps by the shape", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal();

    expect(
      screen.getByRole("heading", { name: "Plan a period for Alice Cooper" }),
    ).toBeInTheDocument();
    expect(periodLabel()).toBe(weekLabel("2026-10-19", "2026-10-23"));
    expect(isPressed("This week")).toBe("true");

    // A week stepped on keeps stepping by weeks, but isn't "this" week.
    await user.click(screen.getByRole("button", { name: "Next week" }));
    expect(periodLabel()).toBe(weekLabel("2026-10-26", "2026-10-30"));
    expect(isPressed("This week")).toBe("false");

    await user.click(screen.getByRole("button", { name: "Full month" }));
    expect(periodLabel()).toBe(formatMonthLabel("2026-10"));
    expect(isPressed("Full month")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(periodLabel()).toBe(formatMonthLabel("2026-11"));
    expect(isPressed("Full month")).toBe("true");

    await user.click(screen.getByRole("button", { name: "This week" }));
    expect(periodLabel()).toBe(weekLabel("2026-10-19", "2026-10-23"));
  });

  it("picks any range on the calendar, first day then last", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal();

    await openCalendar(user);
    await pickDay(user, "2026-10-13");
    await pickDay(user, "2026-10-05");
    expect(
      screen.getByText(
        `From ${formatDayMonthLabel("2026-10-05")}. Now choose the last day.`,
      ),
    ).toBeInTheDocument();

    await pickDay(user, "2026-10-16");
    await waitFor(() =>
      expect(periodLabel()).toBe(weekLabel("2026-10-05", "2026-10-16")),
    );
    // Any other range leaves the toggle unpressed.
    expect(isPressed("This week")).toBe("false");
    expect(isPressed("Full month")).toBe("false");
  });

  it("lists what is already planned and the absences skipped, and saves nothing untouched", () => {
    server.preview = {
      plannedDays: OCTOBER_DAYS.slice(0, 16),
      daysInAnotherTeam: [],
      dayLimitMinutes: 480,
      problems: [],
      changes: [],
    };
    server.absences = [
      {
        id: "a1",
        userId: "user-alice",
        type: AbsenceType.VACATION,
        startDate: "2026-10-19",
        endDate: "2026-10-23",
        createdAt: "",
        updatedAt: "",
      },
    ];
    server.plans = [
      {
        id: "p1",
        userId: "user-alice",
        project: { id: "project-internal", name: "Internal" },
        plannedMinutes: 240,
        date: "2026-10-26",
      } as PlanningEntry,
    ];
    renderModal();

    expect(screen.getByText("Planned in this period")).toBeInTheDocument();
    expect(screen.getByText(/· 1 day$/)).toBeInTheDocument();
    expect(
      screen.getByText(/Away 5 days, skipped: Vacation/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("explains a period with no working days", () => {
    server.preview = {
      plannedDays: [],
      daysInAnotherTeam: [],
      problems: [],
      changes: [],
      dayLimitMinutes: 480,
    };
    server.absences = [
      {
        id: "a1",
        userId: "user-alice",
        type: AbsenceType.SICK_LEAVE,
        startDate: "2026-09-28",
        endDate: "2026-11-06",
        createdAt: "",
        updatedAt: "",
      },
    ];
    renderModal();

    expect(
      screen.getByText("No working days to plan in this period."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Alice is away on every weekday/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("sums up what does not fit and will not save until it does", () => {
    const overDay = (date: string) => ({
      kind: "day" as const,
      date,
      plannedMinutes: 10 * 60,
      limitMinutes: 8 * 60,
      otherProjectsMinutes: 2 * 60,
    });
    server.preview = {
      plannedDays: OCTOBER_DAYS,
      daysInAnotherTeam: [],
      dayLimitMinutes: 480,
      problems: [overDay("2026-10-12"), overDay("2026-10-13")],
      changes: [],
    };
    renderModal();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Doesn't fit Alice's hours");
    expect(alert).toHaveTextContent(
      "2 days go over Alice's 8h day (up to 10h with other plans)",
    );
    expect(alert).not.toHaveTextContent("planned of 8h");
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("shows why the period cannot be planned at all", () => {
    server.preview = null;
    server.previewError = {
      statusCode: 403,
      message:
        "Cannot plan in October 2026 because it is a LOCKED reporting period.",
    };
    renderModal();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "LOCKED reporting period",
    );
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("adds a line per project, totals the day and says when nothing is left to add", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal();

    await fillRow(user, 0, "Northwind", "4");
    await user.click(screen.getByRole("button", { name: "Add a project" }));
    await fillRow(user, 1, "Internal", "2");

    expect(screen.getByText("6h a day")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add a project" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Alice is on no other active project."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Drop the Internal line" }),
    );

    expect(screen.getAllByRole("combobox", { name: /^Project/ })).toHaveLength(
      1,
    );
    expect(screen.getByText("4h a day")).toBeInTheDocument();
  });

  it("says when the person is on no project", () => {
    renderModal({ ...ALICE, projects: [] });

    expect(
      screen.getByText(/Alice is not on any active project/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("sends one request and closes once it is saved", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    server.planPeriod.mockResolvedValue({ days: 22, created: 22, updated: 0 });
    const { onClose } = renderModal();

    await fillRow(user, 0, "Northwind", "4");
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(server.planPeriod).toHaveBeenCalledWith({
      userId: "user-alice",
      startDate: "2026-10-19",
      endDate: "2026-10-23",
      projects: [{ projectId: "project-northwind", minutesPerDay: 240 }],
    });
  });

  it("changes a planned project only on its own days", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    server.plans = ["2026-10-06", "2026-10-07"].map(
      (date, index) =>
        ({
          id: `p${index}`,
          userId: "user-alice",
          project: { id: "project-internal", name: "Internal" },
          plannedMinutes: 120,
          date,
        }) as PlanningEntry,
    );
    server.preview = {
      plannedDays: OCTOBER_DAYS,
      daysInAnotherTeam: [],
      dayLimitMinutes: 480,
      problems: [],
      changes: [{ projectId: "project-internal", added: 0, changed: 2 }],
    };
    server.planPeriod.mockResolvedValue({ days: 22, created: 0, updated: 2 });
    const { onClose } = renderModal();

    const hours = within(
      screen.getByRole("group", { name: "Hours a day for Internal" }),
    ).getByRole("spinbutton", { name: "Hours" });
    // Clicked first, so the dialog's opening focus has settled before typing.
    await user.click(hours);
    await user.clear(hours);
    await user.type(hours, "3");
    await user.tab();

    expect(screen.getByText(/was 2h/)).toBeInTheDocument();
    expect(
      screen.getByText("change Internal from 2h to 3h on 2 days"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save plan" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(server.planPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        projects: [
          {
            projectId: "project-internal",
            minutesPerDay: 180,
            existingDaysOnly: true,
          },
        ],
      }),
    );
  });

  it("asks for hours or the bin when a planned project is set to 0h", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    server.plans = [
      {
        id: "p1",
        userId: "user-alice",
        project: { id: "project-internal", name: "Internal" },
        plannedMinutes: 120,
        date: "2026-10-06",
      } as PlanningEntry,
    ];
    renderModal();

    const hours = within(
      screen.getByRole("group", { name: "Hours a day for Internal" }),
    ).getByRole("spinbutton", { name: "Hours" });
    await user.click(hours);
    await user.clear(hours);
    await user.type(hours, "0");
    await user.tab();

    expect(
      screen.getByText(
        "Enter hours greater than 0, or delete it with the bin.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("offers only the bin for a project the person is no longer on", () => {
    server.plans = [
      {
        id: "p1",
        userId: "user-alice",
        project: { id: "project-old", name: "Old client" },
        plannedMinutes: 120,
        date: "2026-10-06",
      } as PlanningEntry,
    ];
    renderModal();

    expect(screen.getByText("Not on this project")).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Hours a day for Old client" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete the Old client plan" }),
    ).toBeInTheDocument();
  });

  it("keeps a new line out of the save once its project is planned above", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderModal();

    await fillRow(user, 0, "Northwind", "2");
    server.plans = [
      {
        id: "p1",
        userId: "user-alice",
        project: { id: "project-northwind", name: "Northwind" },
        plannedMinutes: 120,
        date: "2026-11-03",
      } as PlanningEntry,
    ];
    await user.click(screen.getByRole("button", { name: "Full month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(
      screen.getByText("Already planned in this period. Change it above."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save plan" })).toBeDisabled();
  });

  it("deletes a planned project in the period once confirmed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    server.plans = [
      {
        id: "p1",
        userId: "user-alice",
        project: { id: "project-internal", name: "Internal" },
        plannedMinutes: 120,
        date: "2026-10-06",
      } as PlanningEntry,
    ];
    renderModal();

    await user.click(
      screen.getByRole("button", { name: "Delete the Internal plan" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Delete the Internal plan?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(server.deletePeriodPlans).toHaveBeenCalledWith(
      {
        userId: "user-alice",
        projectId: "project-internal",
        startDate: "2026-10-19",
        endDate: "2026-10-23",
      },
      expect.anything(),
    );
  });

  it("lists a refusal the save still gives, and stays open", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    server.planPeriod.mockRejectedValue({
      statusCode: 400,
      message: ["Week of 12 Oct: 44h planned of 40h available"],
    });
    const { onClose } = renderModal();

    await fillRow(user, 0, "Northwind", "6");
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    const alert = await screen.findByText("Nothing was saved.");
    expect(alert.parentElement).toHaveTextContent(
      "Week of 12 Oct: 44h planned",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
