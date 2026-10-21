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
  userId: name,
  name,
  position: "Developer",
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

const showReports = (people: PeopleReport, projects: HoursReport) => {
  vi.mocked(usePeopleReport).mockReturnValue(
    loaded(people) as unknown as ReturnType<typeof usePeopleReport>,
  );
  vi.mocked(useHoursReport).mockReturnValue(
    loaded(projects) as unknown as ReturnType<typeof useHoursReport>,
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
  });

  it("sums the period up in three tiles", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const logged = screen.getByRole("region", { name: "Time logged" });
    expect(logged).toHaveTextContent("187h");
    expect(logged).toHaveTextContent(
      "102% of the 184h the team was expected to work",
    );
    expect(screen.getByRole("region", { name: "Billable" })).toHaveTextContent(
      "50% of logged time",
    );
    // Mobile App is within 10% of its plan; WorkTrack and Data Warehouse are not.
    expect(
      screen.getByRole("region", { name: "Close to plan" }),
    ).toHaveTextContent("1 of 3");
  });

  it("puts each person against what was expected, with their days off", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const ethan = within(screen.getByRole("region", { name: "Team" }))
      .getByText("Ethan Brooks")
      .closest("li")!;
    expect(ethan).toHaveTextContent("5 days off");
    expect(ethan).toHaveTextContent("79h of 72h");
    expect(ethan).toHaveTextContent("96h planned");
    expect(
      within(ethan).getByRole("img", {
        name: "Ethan Brooks: 79h logged of 72h expected, 96h planned",
      }),
    ).toBeInTheDocument();
  });

  it("sorts the team by logged time against expected", async () => {
    const user = userEvent.setup();
    showReports(
      peopleReport([...team, person("Grace Morgan", 10, 0, 100)]),
      projectsReport(projects),
    );
    const names = () =>
      within(screen.getByRole("list", { name: "People" }))
        .getAllByRole("listitem")
        .map((row) => row.querySelector("p")?.firstChild?.textContent);

    expect(names()).toEqual(["Ava Mitchell", "Ethan Brooks", "Grace Morgan"]);

    await user.click(screen.getByRole("combobox", { name: "Sort the team" }));
    await user.click(
      await screen.findByRole("option", { name: "Logged vs expected" }),
    );

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
    expect(fintech).toHaveTextContent("No plan for this period");
    expect(fintech).toHaveTextContent("−27h against plan");
    expect(
      within(card).getByRole("region", { name: "Internal work" }),
    ).toHaveTextContent("+20h against plan");
  });

  it("draws time past the plan striped in the brand colour", () => {
    showReports(peopleReport(team), projectsReport(projects));

    const bar = screen.getByRole("img", {
      name: "WorkTrack: 120h logged of 100h planned",
    });
    const past = bar.children[1];
    expect(past).toHaveClass("bg-brand");
    expect(past.firstElementChild).toHaveClass("bg-stripes-overlay");
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
      screen.getByText("Nothing logged or planned in this period"),
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

  it("tells a manager the figures cover their teams, and that they can change", () => {
    showReports(peopleReport(team), projectsReport(projects));

    expect(screen.getByText(/your teams only/)).toBeInTheDocument();
    expect(screen.getByText("Provisional")).toBeInTheDocument();
  });
});
