import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TeamSummaryRow, TimeLog } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";
import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";

import { TeamTimeView } from "./TeamTimeView";

const WEEK_START = new Date("2026-11-02T00:00:00");
// The whole week has happened, so every day takes time.
const NOW = new Date("2026-11-09T09:00:00Z");

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });

const getAssignable = vi.fn();

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
vi.mock("@/hooks/useTeamTimeSummary", () => ({ useTeamTimeSummary: vi.fn() }));
vi.mock("@/hooks/usePlanning", () => ({
  usePlanningEntries: () => ({ items: [] }),
}));
vi.mock("@/hooks/useProjects", () => ({
  useAllProjectsQuery: () => ({
    items: [{ id: "7a9e4d21-5b3c-4f8a-a1d2-6c7b8e9f0a1b", name: "CRM System" }],
  }),
}));
vi.mock("@/hooks/useAbsences", () => ({
  useAllAbsencesQuery: () => ({
    items: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
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
    isError: false,
    refetch: vi.fn(),
  }),
}));
// The teams the viewer sees; none unless a test gives them.
const teams = vi.hoisted(() => ({
  options: [] as { value: string; label: string }[],
}));
vi.mock("@/hooks/useTeams", () => ({
  useTeamOptions: () => ({ ...teams, isLoading: false, isError: false }),
}));
vi.mock("@/hooks/useDismissible", () => ({
  useDismissible: () => ({ isDismissed: true }),
}));
vi.mock("@/hooks/useTimelogs", () => ({
  useTimeLogsMutations: () => ({
    create: mutation(),
    update: mutation(),
    delete: mutation(),
  }),
}));
vi.mock("@/hooks/useAssignableActivities", () => ({
  assignableActivitiesQuery: (userId?: string) => ({
    queryKey: ["assignable", userId],
    queryFn: () => getAssignable(userId),
  }),
  useAssignableActivities: () => ({ items: [] }),
}));

const ENTRY = {
  id: "log-1",
  userId: "user-alice",
  minutes: 300,
  isBillable: true,
  date: "2026-11-02",
  createdAt: "2026-11-02T09:00:00Z",
  updatedAt: "2026-11-02T09:00:00Z",
  projectActivity: {
    project: { id: "project-crm", name: "CRM System" },
    activity: { name: "Design" },
  },
} as TimeLog;

const ALICE: TeamSummaryRow = {
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status: UserStatus.ACTIVE,
    lastWorkingDay: null,
  },
  minutes: 300,
  billableMinutes: 300,
  nonBillableMinutes: 0,
  expectedMinutes: 2400,
  expectedToDateMinutes: 2400,
  expectedByDate: [],
  closedSpells: [],
  moves: [],
  days: [
    {
      date: "2026-11-02",
      minutes: 300,
      billableMinutes: 300,
      nonBillableMinutes: 0,
      entries: [ENTRY],
    },
  ],
};

// Ben has logged nothing, so he is the least complete.
const BEN: TeamSummaryRow = {
  ...ALICE,
  user: {
    ...ALICE.user,
    id: "user-ben",
    firstName: "Ben",
    lastName: "Ward",
    position: "Developer",
  },
  minutes: 0,
  billableMinutes: 0,
  days: [],
};

const summary = (overrides: Partial<ReturnType<typeof useTeamTimeSummary>>) =>
  vi.mocked(useTeamTimeSummary).mockReturnValue({
    rows: [ALICE, BEN],
    totals: { minutes: 300, billableMinutes: 300, nonBillableMinutes: 0 },
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useTeamTimeSummary>);

const showTeamTime = (highlightedPersonId?: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeamTimeView
        role={UserRole.OWNER}
        viewerId="owner"
        highlightedPersonId={highlightedPersonId}
      />
    </QueryClientProvider>,
  );

const aliceRow = () =>
  screen.getByRole("rowheader", { name: /Alice Cooper/ }).closest("tr")!;

const shownNames = () =>
  screen
    .getAllByRole("rowheader")
    .map((cell) => (cell.textContent?.includes("Alice") ? "Alice" : "Ben"));

// The toolbar's figure; the sort header has a "Logged" button of its own.
const weekTotal = () =>
  screen.getAllByText("Logged", { selector: "span" }).at(-1)?.parentElement;

describe("TeamTimeView", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/team");
    teams.options = [];
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    Element.prototype.scrollIntoView = vi.fn();
    summary({});
  });

  afterEach(() => {
    vi.useRealTimers();
    getAssignable.mockReset();
  });

  it("shows a loading state until the week arrives", () => {
    summary({ isLoading: true });
    showTeamTime();

    expect(screen.getByText("Loading the team's week")).toBeInTheDocument();
  });

  it("shows an error with a retry when the week fails", () => {
    summary({ isError: true });
    showTeamTime();

    expect(
      screen.getByText("We couldn't load the team's week"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("asks the summary for the entries and draws them as blocks", () => {
    showTeamTime();

    expect(useTeamTimeSummary).toHaveBeenCalledWith(
      expect.objectContaining({ includeEntries: true }),
    );
    expect(
      within(aliceRow()).getByRole("button", {
        name: "CRM System 5h, edit this entry",
      }),
    ).toBeInTheDocument();
  });

  it("highlights the person a link names, and scrolls to them", () => {
    showTeamTime("user-alice");

    expect(aliceRow()).toHaveClass("bg-brand-subtle");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("opens the form only once the person's activities have loaded", async () => {
    const { promise, resolve: finishLoading } = Promise.withResolvers();
    getAssignable.mockReturnValue(promise);
    const user = userEvent.setup();
    showTeamTime();

    const tuesday = within(aliceRow()).getByRole("button", {
      name: /^Log time for Alice Cooper on Tuesday/,
    });
    await user.click(tuesday);

    expect(getAssignable).toHaveBeenCalledWith("user-alice");
    expect(tuesday.closest("td")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    finishLoading({ count: 0, results: [] });

    const form = await screen.findByRole("dialog");
    expect(form).toHaveTextContent("Log time");
    expect(form).toHaveTextContent("Alice Cooper");
    expect(tuesday.closest("td")).toHaveAttribute("aria-busy", "false");
  });

  it("ignores a second day while a form is still loading", async () => {
    getAssignable.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    showTeamTime();

    await user.click(
      within(aliceRow()).getByRole("button", {
        name: /^Log time for Alice Cooper on Tuesday/,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /^Log time for Ben Ward on Tuesday/ }),
    );

    expect(getAssignable).toHaveBeenCalledTimes(1);
    expect(getAssignable).toHaveBeenCalledWith("user-alice");
  });

  it("opens a block's entry to edit", async () => {
    getAssignable.mockResolvedValue({ count: 0, results: [] });
    const user = userEvent.setup();
    showTeamTime();

    await user.click(
      screen.getByRole("button", { name: "CRM System 5h, edit this entry" }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Edit time entry",
    );
  });

  it("never hides time logged on a weekend", () => {
    const saturday = {
      date: "2026-11-07",
      minutes: 120,
      billableMinutes: 120,
      nonBillableMinutes: 0,
      entries: [{ ...ENTRY, id: "log-2", date: "2026-11-07", minutes: 120 }],
    };
    summary({ rows: [{ ...ALICE, days: [...ALICE.days, saturday] }, BEN] });
    showTeamTime();

    // Person, seven days and the week's total.
    expect(screen.getAllByRole("columnheader")).toHaveLength(9);
    // Nothing offers to fold it.
    expect(
      screen.queryByRole("button", { name: "Hide Saturday and Sunday" }),
    ).not.toBeInTheDocument();
  });

  it("shows the weekend on request, and asks before logging time on it", async () => {
    getAssignable.mockResolvedValue({ count: 0, results: [] });
    const user = userEvent.setup();
    showTeamTime();

    expect(
      within(aliceRow()).queryByRole("button", {
        name: /^Log time for Alice Cooper on Saturday/,
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Show Saturday and Sunday" }),
    );

    await user.click(
      within(aliceRow()).getByRole("button", {
        name: /^Log time for Alice Cooper on Saturday/,
      }),
    );

    expect(
      await screen.findByText("Log time on a non-work day?"),
    ).toBeInTheDocument();
    expect(getAssignable).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Log time" }));

    expect(getAssignable).toHaveBeenCalledWith("user-alice");
  });

  it("reads the team and project from the URL, dropping a project that isn't listed", () => {
    const teamId = "3f1c2b7e-8a4d-4c1e-9b2a-1d5e6f7a8b9c";
    teams.options = [{ value: teamId, label: "Core Development" }];
    window.history.replaceState(
      null,
      "",
      `/team?team=${teamId}&project=not-an-id`,
    );
    showTeamTime();

    expect(useTeamTimeSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ teamId, projectId: undefined }),
    );
    expect(window.location.search).toBe(`?team=${teamId}`);

    vi.mocked(useTeamTimeSummary).mockClear();
    window.history.replaceState(
      null,
      "",
      "/team?project=7a9e4d21-5b3c-4f8a-a1d2-6c7b8e9f0a1b",
    );
    showTeamTime();

    expect(useTeamTimeSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectId: "7a9e4d21-5b3c-4f8a-a1d2-6c7b8e9f0a1b",
      }),
    );
    // A project's hours have no expected figure to be measured against.
    expect(weekTotal()).toHaveTextContent(/^Logged\s*5h$/);
  });

  it("drops a team link that isn't one of the viewer's teams from the address", () => {
    teams.options = [
      {
        value: "3f1c2b7e-8a4d-4c1e-9b2a-1d5e6f7a8b9c",
        label: "Core Development",
      },
    ];

    // Another team's id, and one mistyped with a leading colon.
    for (const team of [
      "e942e902-d86f-442e-807b-7a71d93cdfe9",
      "%3Ae942e902-d86f-442e-807b-7a71d93cdfe9",
    ]) {
      window.history.replaceState(null, "", `/team?team=${team}`);
      showTeamTime();

      expect(useTeamTimeSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ teamId: undefined }),
      );
      expect(window.location.pathname + window.location.search).toBe("/team");
      cleanup();
    }
  });

  it("totals the week against what was expected of everyone shown", () => {
    showTeamTime();

    expect(weekTotal()).toHaveTextContent(/^Logged\s*5h \/ 80h$/);
  });

  it("reads the search and sort from the URL, and writes them back", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/team?search=develop&sort=total");
    showTeamTime();

    expect(shownNames()).toEqual(["Ben"]);
    expect(
      screen.getByRole("columnheader", { name: /Logged/ }),
    ).toHaveAttribute("aria-sort", "ascending");

    await user.clear(
      screen.getByRole("textbox", { name: "Search by name or position" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Sort by name, A to Z" }),
    );
    // Back at the defaults, the address holds neither.
    expect(window.location.search).toBe("");

    await user.click(
      screen.getByRole("button", { name: "Sort by name, Z to A" }),
    );
    expect(window.location.search).toBe("?sort=name-desc");
  });

  it("searches people by name or position, and totals only them", async () => {
    const user = userEvent.setup();
    showTeamTime();

    await user.type(
      screen.getByRole("textbox", { name: "Search by name or position" }),
      "develop",
    );

    expect(shownNames()).toEqual(["Ben"]);
    expect(weekTotal()).toHaveTextContent(/^Logged\s*0h \/ 40h$/);

    await user.clear(
      screen.getByRole("textbox", { name: "Search by name or position" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Search by name or position" }),
      "nobody",
    );
    expect(screen.getByText("Nobody matches")).toBeInTheDocument();

    // The empty state's button resets everything.
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(shownNames()).toEqual(["Alice", "Ben"]);
  });

  it("sorts by name, and by logged time from the header", async () => {
    const user = userEvent.setup();
    showTeamTime();

    const [header] = screen.getAllByRole("columnheader");
    const loggedHeader = screen.getAllByRole("columnheader").at(-1)!;
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(shownNames()).toEqual(["Alice", "Ben"]);

    await user.click(
      screen.getByRole("button", { name: "Sort by name, Z to A" }),
    );
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(shownNames()).toEqual(["Ben", "Alice"]);

    const logged = screen.getByRole("button", {
      name: "Sort by logged time, least first",
    });
    await user.click(logged);
    expect(loggedHeader).toHaveAttribute("aria-sort", "ascending");
    expect(header).not.toHaveAttribute("aria-sort");
    expect(shownNames()).toEqual(["Ben", "Alice"]);

    await user.click(
      screen.getByRole("button", { name: "Sort by logged time, most first" }),
    );
    expect(shownNames()).toEqual(["Alice", "Ben"]);
  });
});
