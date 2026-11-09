import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, PlanningWeekRow, Project } from "@/types";
import { AbsenceType, UserRole, UserStatus } from "@/types/enums";

import { PlanningWeekView } from "./PlanningWeekView";

const WEEK_START = new Date("2026-11-02T00:00:00");
const NOW = new Date("2026-11-04T09:00:00Z");
const NORTHWIND_ID = "7a9e4d21-5b3c-4f8a-a1d2-6c7b8e9f0a1b";

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/hooks/useWorkSettings", () => ({
  useWorkSettings: () => ({
    weekStartDay: 1,
    dailyTargetMinutes: 480,
    timezone: "UTC",
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/hooks/useShownWeek", () => ({
  useShownWeek: () => ({ weekStart: WEEK_START, showWeekOf: vi.fn() }),
}));
vi.mock("@/hooks/usePlanning", () => ({ usePlanningWeek: vi.fn() }));
const projectList = vi.hoisted(() => ({ status: "ACTIVE" }));
vi.mock("@/hooks/useProjects", () => ({
  useAllProjectsQuery: () => ({
    items: [
      { id: NORTHWIND_ID, name: "Northwind", status: projectList.status },
    ],
  }),
}));
vi.mock("@/hooks/useAbsences", () => ({
  useAllAbsencesQuery: vi.fn(),
  useAbsencesMutations: () => ({
    create: mutation(),
    update: mutation(),
    delete: mutation(),
  }),
}));
vi.mock("@/hooks/useReportingPeriods", () => ({
  useLockedDates: () => ({
    isLocked: () => false,
    isEditable: () => true,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/hooks/useTeams", () => ({
  useTeamOptions: () => ({
    options: [{ value: "team-1", label: "Alpha" }],
    isLoading: false,
    isError: false,
  }),
}));
// The dialogs are tested on their own; here only which one a click opens.
vi.mock("./components/PlanningDayModal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PlanningDayModal: () => <p>Day dialog</p>,
}));
vi.mock("./components/PlanPeriodModal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PlanPeriodModal: () => <p>Period dialog</p>,
}));
vi.mock("../timesheet/components/AbsenceFormModal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  AbsenceFormModal: () => <p>Absence form</p>,
  LockedAbsenceModal: () => <p>Read-only absence</p>,
}));

import { usePlanningWeek } from "@/hooks/usePlanning";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";

const NORTHWIND = { id: NORTHWIND_ID, name: "Northwind" };
const INTERNAL = { id: "project-internal", name: "Internal" };

const plan = (
  id: string,
  userId: string,
  project: { id: string; name: string },
  date: string,
  plannedMinutes: number,
): PlanningEntry =>
  ({
    id,
    userId,
    project: { ...project, status: "ACTIVE" } as Project,
    plannedMinutes,
    date,
    createdAt: "2026-11-01T09:00:00Z",
    updatedAt: "2026-11-01T09:00:00Z",
  }) as PlanningEntry;

const row = (
  id: string,
  firstName: string,
  lastName: string,
  position: string,
  projects: { id: string; name: string }[],
  entries: PlanningEntry[],
): PlanningWeekRow => ({
  user: {
    id,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@example.com`,
    position,
    status: UserStatus.ACTIVE,
  },
  plannedMinutes: entries.reduce((sum, entry) => sum + entry.plannedMinutes, 0),
  availableMinutes: 2400,
  // A full-time week: 8h on each working day.
  dayLimits: [
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06",
  ].map((date) => ({ date, minutes: 480 })),
  projects,
  entries,
  closedSpells: [],
  moves: [],
});

const ALICE = row(
  "user-alice",
  "Alice",
  "Cooper",
  "Designer",
  [NORTHWIND, INTERNAL],
  [
    plan("p-1", "user-alice", NORTHWIND, "2026-11-02", 240),
    plan("p-2", "user-alice", INTERNAL, "2026-11-02", 120),
  ],
);
const BEN = row("user-ben", "Ben", "Ward", "Developer", [INTERNAL], []);

const absence = (
  id: string,
  userId: string,
  date: string,
  canChange: boolean,
): Absence =>
  ({
    id,
    userId,
    type: AbsenceType.VACATION,
    startDate: date,
    endDate: date,
    canChange,
  }) as Absence;

const showPlanning = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PlanningWeekView role={UserRole.MANAGER} viewerId="manager" />
    </QueryClientProvider>,
  );

const rowOf = (name: RegExp) =>
  screen.getByRole("rowheader", { name }).closest("tr")!;

const shownNames = () =>
  screen
    .getAllByRole("rowheader")
    .map((cell) => (cell.textContent?.includes("Alice") ? "Alice" : "Ben"));

describe("PlanningWeekView", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/planning");
    projectList.status = "ACTIVE";
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.mocked(usePlanningWeek).mockReturnValue({
      rows: [ALICE, BEN],
      isLoading: false,
      isPlaceholderData: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePlanningWeek>);
    vi.mocked(useAllAbsencesQuery).mockReturnValue({
      items: [
        absence("a-1", "user-alice", "2026-11-04", false),
        absence("a-2", "user-ben", "2026-11-03", true),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAllAbsencesQuery>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the day dialog, the absence form, or the read-only absence by what the day holds", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    showPlanning();

    await user.click(
      within(rowOf(/Alice Cooper/)).getByRole("button", {
        name: /^Thursday, November 5/,
      }),
    );
    expect(screen.getByText("Day dialog")).toBeInTheDocument();

    await user.click(
      within(rowOf(/Ben Ward/)).getByRole("button", {
        name: /^Tuesday, November 3/,
      }),
    );
    expect(screen.getByText("Absence form")).toBeInTheDocument();

    // An absence the API says the viewer can't change opens to be read.
    await user.click(
      within(rowOf(/Alice Cooper/)).getByRole("button", {
        name: /^Wednesday, November 4/,
      }),
    );
    expect(screen.getByText("Read-only absence")).toBeInTheDocument();
  });

  it("narrows the rows to a project's people and their plans on it, and by a search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    window.history.replaceState(null, "", `/planning?project=${NORTHWIND_ID}`);
    showPlanning();

    expect(shownNames()).toEqual(["Alice"]);
    const alice = rowOf(/Alice Cooper/);
    expect(within(alice).getByText("Northwind")).toBeInTheDocument();
    expect(within(alice).queryByText("Internal")).not.toBeInTheDocument();
    expect(alice).toHaveTextContent("4h on Northwind");

    const search = screen.getByRole("textbox", {
      name: "Search by name or position",
    });
    await user.type(search, "nobody");
    expect(
      screen.getByText("Nobody matches these filters"),
    ).toBeInTheDocument();

    // Clears the project and the search together (the address too).
    await user.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0],
    );
    expect(shownNames()).toEqual(["Alice", "Ben"]);
    expect(window.location.search).toBe("");

    await user.type(search, "develop");
    expect(shownNames()).toEqual(["Ben"]);
  });

  it("ignores a link's project once it is archived, as the filter can't offer it", () => {
    projectList.status = "ARCHIVED";
    window.history.replaceState(null, "", `/planning?project=${NORTHWIND_ID}`);
    showPlanning();

    expect(shownNames()).toEqual(["Alice", "Ben"]);
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });
});
