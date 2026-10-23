import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  HoursReport,
  HoursReportRow,
  PeopleReport,
  PeopleReportRow,
} from "@/types";
import { HoursReportGroupBy, UserRole } from "@/types/enums";

import { useHoursReport } from "@/hooks/useHoursReport";
import { usePeopleReport } from "@/hooks/usePeopleReport";
import { useTeamTimeSummary } from "@/hooks/useTeamTimeSummary";
import { useTimeline } from "@/hooks/useTimeline";
import { useAllAbsencesQuery } from "@/hooks/useAbsences";
import { addDays, isWeekend, toISODate } from "@/lib/utils/date";
import { AbsenceType } from "@/types/enums";

import { ReportsView } from "./ReportsView";

const HOUR = 60;

vi.mock("@/hooks/auth/useCompany", () => ({
  useCompany: () => ({
    company: { timezone: "UTC", createdAt: "2024-01-01T00:00:00Z" },
  }),
}));
vi.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ user: { role: UserRole.MANAGER } }),
}));
vi.mock("@/hooks/usePeopleReport", () => ({ usePeopleReport: vi.fn() }));
vi.mock("@/hooks/useTeamTimeSummary", () => ({ useTeamTimeSummary: vi.fn() }));
vi.mock("@/hooks/useTimeline", () => ({ useTimeline: vi.fn() }));
vi.mock("@/hooks/useActivityCategories", () => ({
  useActivityCategoriesAllPagesQuery: () => ({
    items: [{ name: "Design" }, { name: "Development" }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/hooks/useAbsences", () => ({ useAllAbsencesQuery: vi.fn() }));
vi.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: () => true }));

// The page keeps its open panel in the URL; this stands in for the router.
const navigation = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const history: string[] = [""];

  return {
    listeners,
    history,
    get search() {
      return history.at(-1)!;
    },
    go(update: () => void) {
      update();
      listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");

  return {
    usePathname: () => "/reports",
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (listener) => {
            navigation.listeners.add(listener);
            return () => navigation.listeners.delete(listener);
          },
          () => navigation.search,
        ),
      ),
  };
});

const searchOf = (url: string | URL | null | undefined) =>
  new URL(String(url), "http://localhost").search;
vi.mock("@/hooks/useHoursReport", () => ({
  useHoursReport: vi.fn(),
  useHoursExport: () => ({ mutate: vi.fn(), isPending: false }),
}));

const person = (
  name: string,
  loggedHours: number,
  plannedHours: number,
  expectedHours: number,
  timeOffDays = 0,
): PeopleReportRow => ({
  userId: name.toLowerCase().replace(" ", "-"),
  name,
  position: "Developer",
  teams: [],
  loggedMinutes: loggedHours * HOUR,
  billableMinutes: (loggedHours / 2) * HOUR,
  nonBillableMinutes: (loggedHours / 2) * HOUR,
  plannedMinutes: plannedHours * HOUR,
  expectedMinutes: expectedHours * HOUR,
  timeOffDays,
  daysWithoutTime: [],
});

const project = (
  name: string,
  client: string | null,
  loggedHours: number,
  plannedHours: number,
): HoursReportRow => ({
  id: name,
  name,
  detail: client,
  billableMinutes: client ? loggedHours * HOUR : 0,
  nonBillableMinutes: client ? 0 : loggedHours * HOUR,
  totalMinutes: loggedHours * HOUR,
  plannedMinutes: plannedHours * HOUR,
  peopleCount: 2,
});

const peopleReport = (rows: PeopleReportRow[]): PeopleReport => ({
  rows,
  totals: rows.reduce(
    (sum, row) => ({
      loggedMinutes: sum.loggedMinutes + row.loggedMinutes,
      billableMinutes: sum.billableMinutes + row.billableMinutes,
      nonBillableMinutes: sum.nonBillableMinutes + row.nonBillableMinutes,
      plannedMinutes: sum.plannedMinutes + row.plannedMinutes,
      expectedMinutes: sum.expectedMinutes + row.expectedMinutes,
      timeOffDays: sum.timeOffDays + row.timeOffDays,
      daysWithoutTime: 0,
    }),
    {
      loggedMinutes: 0,
      billableMinutes: 0,
      nonBillableMinutes: 0,
      plannedMinutes: 0,
      expectedMinutes: 0,
      timeOffDays: 0,
      daysWithoutTime: 0,
    },
  ),
  isProvisional: true,
  countedUntil: null,
});

const projectsReport = (rows: HoursReportRow[]): HoursReport => ({
  groupBy: HoursReportGroupBy.PROJECT,
  rows,
  totals: {
    billableMinutes: 0,
    nonBillableMinutes: 0,
    totalMinutes: 0,
    plannedMinutes: 0,
    peopleCount: 0,
  },
  isProvisional: true,
  countedUntil: null,
});

const loaded = <T,>(report: T) => ({
  report,
  isLoading: false,
  isPlaceholderData: false,
  isError: false,
  refetch: vi.fn(),
});

/** What the panels load: a person's projects and a project's people. */
const panelRows = {
  personProjects: [] as HoursReportRow[],
  projectPeople: [] as HoursReportRow[],
};

/** The activities behind "Kind of work". */
const activityRows: HoursReportRow[] = [
  { ...project("Backend", "Development", 30, 0), plannedMinutes: null },
  { ...project("UI Design", "Design", 10, 0), plannedMinutes: null },
];

const showReports = (people: PeopleReport, projects: HoursReport) => {
  vi.mocked(usePeopleReport).mockReturnValue(
    loaded(people) as unknown as ReturnType<typeof usePeopleReport>,
  );
  vi.mocked(useHoursReport).mockImplementation(
    (params) =>
      loaded(
        params.userId
          ? projectsReport(panelRows.personProjects)
          : params.projectId
            ? projectsReport(panelRows.projectPeople)
            : params.groupBy === HoursReportGroupBy.ACTIVITY
              ? projectsReport(activityRows)
              : projects,
      ) as unknown as ReturnType<typeof useHoursReport>,
  );
  render(<ReportsView />);
};

describe("ReportsView", () => {
  const team = [
    person("Ethan Brooks", 79, 96, 72, 5),
    person("Ava Mitchell", 108, 104, 112),
  ];
  const projects = [
    project("WorkTrack", null, 120, 100),
    project("Mobile App", "Retail Corp", 54, 50),
    project("CRM System", "fintech group", 10, 0),
    project("Data Warehouse", "Fintech Group", 3, 30),
  ];

  beforeEach(() => {
    vi.mocked(usePeopleReport).mockReset();
    vi.mocked(useHoursReport).mockReset();
    navigation.history.splice(0, navigation.history.length, "");
    vi.mocked(useTeamTimeSummary).mockReturnValue({
      rows: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTeamTimeSummary>);
    vi.mocked(useTimeline).mockReturnValue({
      timeline: {
        buckets: [
          {
            start: "2026-10-01",
            end: "2026-10-04",
            workingDays: 2,
            isPartial: true,
            loggedMinutes: 14 * HOUR,
            billableMinutes: 0,
            plannedMinutes: 12 * HOUR,
            expectedMinutes: 16 * HOUR,
          },
          {
            start: "2026-10-05",
            end: "2026-10-11",
            workingDays: 5,
            isPartial: false,
            loggedMinutes: 38 * HOUR,
            billableMinutes: 0,
            plannedMinutes: 40 * HOUR,
            expectedMinutes: 40 * HOUR,
          },
        ],
        isProvisional: true,
        countedUntil: null,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTimeline>);
    vi.mocked(useAllAbsencesQuery).mockReturnValue({
      items: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAllAbsencesQuery>);
  });

  it("sums the month up above its weeks", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const weeks = screen.getByRole("region", { name: "Week by week" });
    expect(weeks).toHaveTextContent("Logged187h102% of 184h expected");
    expect(weeks).toHaveTextContent("50% of logged");
    expect(screen.queryByRole("region", { name: "Close to plan" })).toBeNull();
  });

  it("puts each person against what was expected, with their days off", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const ethan = within(screen.getByRole("region", { name: "Team" }))
      .getByText("Ethan Brooks")
      .closest("li")!;
    expect(ethan).toHaveTextContent("5 days off");
    expect(ethan).toHaveTextContent("79h logged");
    expect(ethan).toHaveTextContent("72h expected · 96h planned");
    expect(
      within(ethan).getByRole("img", {
        name: "Ethan Brooks: 79h logged, 72h expected, 96h planned",
      }),
    ).toBeInTheDocument();
  });

  it("orders the team by name, or by the share of expected hours logged", async () => {
    const user = userEvent.setup();
    showReports(
      peopleReport([...team, person("Grace Morgan", 10, 0, 100)]),
      projectsReport(projects),
    );
    const names = () =>
      within(screen.getByRole("list", { name: "People" }))
        .getAllByRole("listitem")
        .map((row) => row.querySelector("button")?.textContent);

    expect(names()).toEqual(["Ava Mitchell", "Ethan Brooks", "Grace Morgan"]);
    expect(screen.getByText("Alphabetical")).toBeInTheDocument();
    // A missing plan is said in words, not drawn as 0h.
    expect(screen.getByText("Grace Morgan").closest("li")).toHaveTextContent(
      "100h expected · not planned",
    );

    const mostLogged = screen.getByRole("button", {
      name: "Most logged first",
    });
    await user.click(mostLogged);

    expect(mostLogged).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("Largest share of expected hours first"),
    ).toBeInTheDocument();
    expect(names()).toEqual(["Ethan Brooks", "Ava Mitchell", "Grace Morgan"]);
  });

  it("groups projects under their client, internal work last", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const card = screen.getByRole("region", { name: "Projects" });
    const clients = within(card)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(clients).toEqual(["Retail Corp", "Fintech Group", "Internal work"]);

    const fintech = within(card).getByRole("region", {
      name: "Fintech Group",
    });
    expect(fintech).toHaveTextContent("13h · 100% billable");
    expect(fintech).toHaveTextContent("10h logged");
    expect(fintech).toHaveTextContent("not planned");
    expect(fintech).toHaveTextContent("30h planned · −27h");
    expect(
      within(card).getByRole("region", { name: "Internal work" }),
    ).toHaveTextContent("100h planned · +20h");
  });

  it("draws time past the plan striped in the brand colour", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const bar = screen.getByRole("img", {
      name: "WorkTrack: 120h logged, 100h planned, +20h",
    });
    const stripes = bar.querySelector(".bg-stripes-overlay");
    expect(stripes?.parentElement).toHaveClass("bg-brand");
  });

  it("shows the month week by week and by kind of work", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const weeks = screen.getByRole("region", { name: "Week by week" });
    expect(weeks).toHaveTextContent("Oct 1–4");
    expect(weeks).toHaveTextContent("2 days");
    // Each week can be focused, and names all three of its figures.
    const week = within(weeks).getByRole("img", {
      name: "Oct 5–11: 38h logged · 40h planned · 40h expected",
    });
    expect(week).toHaveAttribute("tabindex", "0");

    const kind = screen.getByRole("region", { name: "Kind of work" });
    expect(
      within(kind).getByRole("img", { name: "Development 75%, Design 25%" }),
    ).toBeInTheDocument();
    expect(kind).toHaveTextContent("30h");
  });

  it("says when the period has nothing counted yet", () => {
    showReports(
      { ...peopleReport([]), countedUntil: "2000-01-01" },
      projectsReport([]),
    );

    expect(screen.getByText("Nothing counted yet")).toBeInTheDocument();
  });

  it("says when nothing was logged or planned", () => {
    showReports(
      peopleReport([person("Ava Mitchell", 0, 0, 112)]),
      projectsReport([]),
    );

    expect(
      screen.getByText("Nothing logged or planned in this month"),
    ).toBeInTheDocument();
  });

  it("offers to try again when the report fails", () => {
    vi.mocked(usePeopleReport).mockReturnValue({
      ...loaded(null),
      isError: true,
    } as unknown as ReturnType<typeof usePeopleReport>);
    vi.mocked(useHoursReport).mockReturnValue(
      loaded(projectsReport([])) as unknown as ReturnType<
        typeof useHoursReport
      >,
    );
    render(<ReportsView />);

    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("tells a manager the figures cover their teams, and that the month is open", () => {
    showReports(peopleReport(team), projectsReport(projects));

    expect(screen.getByText(/your teams/)).toBeInTheDocument();
    expect(screen.getByText("Month still open")).toBeInTheDocument();
  });

  describe("panels", () => {
    // The page opens on the current month, so its days come from today.
    const today = new Date();
    const weekdays: string[] = [];
    for (
      let day = new Date(today.getFullYear(), today.getMonth(), 1);
      weekdays.length < 3;
      day = addDays(day, 1)
    ) {
      if (!isWeekend(day)) weekdays.push(toISODate(day));
    }
    const [loggedDay, offDay, dayWithoutTime] = weekdays;

    beforeEach(() => {
      vi.spyOn(window.history, "pushState").mockImplementation(
        (_state, _unused, url) =>
          navigation.go(() => navigation.history.push(searchOf(url))),
      );
      vi.spyOn(window.history, "replaceState").mockImplementation(
        (_state, _unused, url) =>
          navigation.go(() => {
            navigation.history[navigation.history.length - 1] = searchOf(url);
          }),
      );
      vi.spyOn(window.history, "back").mockImplementation(() =>
        navigation.go(() => navigation.history.pop()),
      );

      panelRows.personProjects = [
        project("WorkTrack", null, 40, 30),
        project("Mobile App", "Retail Corp", 39, 66),
      ];
      panelRows.projectPeople = [
        { ...project("Ava Mitchell", null, 30, 26), detail: "Developer" },
      ];
    });

    const ethan = {
      ...person("Ethan Brooks", 79, 96, 72, 5),
      daysWithoutTime: [dayWithoutTime],
    };

    it("opens a person with their figures, days and projects, and closes back to the row", async () => {
      vi.mocked(useTeamTimeSummary).mockReturnValue({
        rows: [
          {
            user: { id: ethan.userId },
            days: [{ date: loggedDay, minutes: 8 * HOUR }],
          },
        ],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useTeamTimeSummary>);
      vi.mocked(useAllAbsencesQuery).mockReturnValue({
        items: [
          {
            id: "a",
            userId: ethan.userId,
            type: AbsenceType.VACATION,
            startDate: offDay,
            endDate: offDay,
          },
        ],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useAllAbsencesQuery>);
      const user = userEvent.setup();
      showReports(peopleReport([ethan]), projectsReport(projects));

      const row = screen.getByRole("button", { name: "Ethan Brooks" });
      await user.click(row);

      expect(navigation.search).toBe("?person=ethan-brooks");
      const panel = screen.getByRole("complementary", { name: "Ethan Brooks" });
      expect(panel).toHaveTextContent("of 72h expected");
      expect(panel).toHaveTextContent("+24h against expected");
      expect(panel).toHaveTextContent("1 day with no time logged");
      expect(panel).toHaveTextContent("Vacation");

      const days = within(panel)
        .getAllByRole("listitem")
        .filter(
          (item) => item.closest("ul")?.getAttribute("aria-label") === "Days",
        );
      expect(days[0]).toHaveTextContent("8h");
      expect(days[1]).toHaveTextContent("Vacation");
      expect(days[2]).toHaveTextContent("No time");
      // Each day sits in its weekday's column, Monday first.
      expect(days[0]).toHaveStyle({
        gridColumnStart: String(new Date(`${loggedDay}T00:00`).getDay()),
      });

      const projectsSection = within(panel).getByRole("region", {
        name: "Projects",
      });
      expect(projectsSection).toHaveTextContent("Mobile App");
      expect(projectsSection).toHaveTextContent("66h planned · −27h");
      expect(
        within(panel).getByRole("link", { name: /Open in Team time/ }),
      ).toHaveAttribute("href", "/team?person=ethan-brooks");

      await user.click(
        within(panel).getByRole("button", { name: "Close panel" }),
      );

      expect(navigation.search).toBe("");
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(row).toHaveFocus();
    });

    it("says when a person has no plan or nothing expected, with no gap", () => {
      navigation.history.splice(0, 1, "?person=noah-reed");
      showReports(
        peopleReport([person("Noah Reed", 10, 0, 0, 0)]),
        projectsReport(projects),
      );

      const panel = screen.getByRole("complementary", { name: "Noah Reed" });
      expect(panel).toHaveTextContent("Nothing expected");
      expect(panel).toHaveTextContent("Not planned");
      expect(panel).not.toHaveTextContent("against expected");
    });

    it("opens a project from a pasted link, with its people against their plans", () => {
      navigation.history.splice(0, 1, "?project=Mobile App");
      showReports(peopleReport(team), projectsReport(projects));

      const panel = screen.getByRole("complementary", { name: "Mobile App" });
      expect(panel).toHaveTextContent("Retail Corp");
      expect(panel).toHaveTextContent("of 50h planned");
      expect(
        within(panel).getByRole("region", { name: "People" }),
      ).toHaveTextContent("26h planned · +4h");
    });

    it("swaps one open panel for another without a new history entry", async () => {
      const user = userEvent.setup();
      showReports(peopleReport([ethan]), projectsReport(projects));

      await user.click(screen.getByRole("button", { name: "Ethan Brooks" }));
      await user.click(screen.getByRole("button", { name: "Mobile App" }));

      expect(navigation.history).toEqual(["", "?project=Mobile+App"]);
      expect(
        screen.getByRole("complementary", { name: "Mobile App" }),
      ).toBeInTheDocument();
    });

    it("says what needs attention, one card per kind, each acting where it points", async () => {
      const user = userEvent.setup();
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      showReports(peopleReport(team), projectsReport(projects));

      const card = screen.getByRole("region", { name: "Needs attention" });
      expect(
        within(card)
          .getAllByRole("listitem")
          .map((item) => item.firstChild?.textContent),
      ).toEqual([
        "3 projects are more than 10% off plan",
        "Ethan Brooks is planned beyond their hours",
      ]);
      expect(card).toHaveTextContent(
        "Largest: Data Warehouse −27h · WorkTrack +20h",
      );

      await user.click(
        within(card).getByRole("button", { name: /^See projects/ }),
      );
      expect(scrollIntoView).toHaveBeenCalled();

      await user.click(
        within(card).getByRole("button", { name: /^Open person/ }),
      );
      expect(navigation.search).toBe("?person=ethan-brooks");
    });

    it("says when nothing needs attention", () => {
      showReports(
        peopleReport([person("Ava Mitchell", 112, 112, 112)]),
        projectsReport([project("Mobile App", "Retail Corp", 50, 50)]),
      );

      expect(
        screen.getByText("Nothing needs attention this month."),
      ).toBeInTheDocument();
    });

    it("waits for the person's days off before drawing their days", () => {
      vi.mocked(useAllAbsencesQuery).mockReturnValue({
        items: [],
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useAllAbsencesQuery>);
      navigation.history.splice(0, 1, `?person=${ethan.userId}`);
      showReports(peopleReport([ethan]), projectsReport(projects));

      const panel = screen.getByRole("complementary", { name: "Ethan Brooks" });
      expect(
        within(panel).queryByRole("list", { name: "Days" }),
      ).not.toBeInTheDocument();
      expect(panel).toHaveTextContent("Loading the days…");
      expect(panel).not.toHaveTextContent("None");
    });

    it("drops a link to someone outside the rows", () => {
      navigation.history.splice(0, 1, "?person=somebody-else");
      showReports(peopleReport(team), projectsReport(projects));

      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(navigation.search).toBe("");
    });

    it("closes the panel, URL included, when another period leaves the person out", async () => {
      const user = userEvent.setup();
      showReports(peopleReport([ethan]), projectsReport(projects));
      await user.click(screen.getByRole("button", { name: "Ethan Brooks" }));

      vi.mocked(usePeopleReport).mockReturnValue(
        loaded(peopleReport(team.slice(1))) as unknown as ReturnType<
          typeof usePeopleReport
        >,
      );
      await user.click(screen.getByRole("button", { name: "Previous month" }));

      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(navigation.history).toEqual([""]);
    });
  });
});
