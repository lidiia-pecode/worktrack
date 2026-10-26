import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HoursReport, PeopleReport, PeopleReportRow } from "@/types";
import { AbsenceType, HoursReportGroupBy } from "@/types/enums";
import { useHoursReport } from "@/hooks/useHoursReport";
import { usePeopleReport } from "@/hooks/usePeopleReport";

import { MyTimeView } from "./MyTimeView";

const HOUR = 60;
const ME = "me";
const NOW = new Date("2026-10-24T09:00:00Z");

vi.mock("@/hooks/auth/useCompany", () => ({
  useCompany: () => ({
    company: { timezone: "UTC", createdAt: "2026-09-10T00:00:00Z" },
  }),
}));
vi.mock("@/hooks/usePeopleReport", () => ({ usePeopleReport: vi.fn() }));
vi.mock("@/hooks/useHoursReport", () => ({ useHoursReport: vi.fn() }));
vi.mock("@/hooks/useTeamTimeSummary", () => ({
  useTeamTimeSummary: () => ({
    rows: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/hooks/useAbsences", () => ({
  useAllAbsencesQuery: () => ({
    items: [
      {
        type: AbsenceType.VACATION,
        startDate: "2026-10-12",
        endDate: "2026-10-13",
      },
      // Not yet counted: after the last finished day.
      {
        type: AbsenceType.SICK_LEAVE,
        startDate: "2026-10-28",
        endDate: "2026-10-28",
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const myRow: PeopleReportRow = {
  userId: ME,
  name: "Emma Carter",
  position: "Developer",
  teams: [],
  loggedMinutes: 120 * HOUR,
  billableMinutes: 90 * HOUR,
  nonBillableMinutes: 30 * HOUR,
  plannedMinutes: 140 * HOUR,
  expectedMinutes: 136 * HOUR,
  timeOffDays: 2,
  daysWithoutTime: ["2026-10-14"],
};

const peopleReport = (rows: PeopleReportRow[]): PeopleReport =>
  ({
    rows,
    totals: {},
    isProvisional: true,
    countedUntil: "2026-10-23",
  }) as unknown as PeopleReport;

const projects: HoursReport = {
  groupBy: HoursReportGroupBy.PROJECT,
  rows: [
    {
      id: "crm",
      name: "CRM System",
      detail: "Acme",
      billableMinutes: 90 * HOUR,
      nonBillableMinutes: 0,
      totalMinutes: 90 * HOUR,
      plannedMinutes: 100 * HOUR,
    },
  ],
  totals: {
    billableMinutes: 0,
    nonBillableMinutes: 0,
    totalMinutes: 0,
    plannedMinutes: 0,
  },
  isProvisional: true,
  countedUntil: "2026-10-23",
};

const loaded = <T,>(report: T) => ({
  report,
  isLoading: false,
  isPlaceholderData: false,
  isError: false,
  refetch: vi.fn(),
});

const showMyTime = (report: PeopleReport) => {
  vi.mocked(usePeopleReport).mockReturnValue(
    loaded(report) as unknown as ReturnType<typeof usePeopleReport>,
  );
  vi.mocked(useHoursReport).mockReturnValue(
    loaded(projects) as unknown as ReturnType<typeof useHoursReport>,
  );
  render(<MyTimeView userId={ME} />);
};

describe("MyTimeView", () => {
  beforeEach(() => {
    // Only the clock: user-event still needs real timers.
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("shows the person's own month: logged against expected, the facts and the projects", () => {
    // A manager's report lists their team too; the page takes their own row.
    showMyTime(
      peopleReport([
        { ...myRow, userId: "teammate", name: "Liam Hayes" },
        myRow,
      ]),
    );

    expect(screen.getByText("October 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Up to Oct 23 · open for edits"),
    ).toBeInTheDocument();
    expect(screen.getByText("120h")).toBeInTheDocument();
    expect(screen.getByText("of 136h expected")).toBeInTheDocument();
    expect(screen.getByText("16h still to log")).toBeInTheDocument();
    expect(screen.getByText("140h")).toBeInTheDocument();
    expect(screen.getByText("2 days · Vacation")).toBeInTheDocument();
    expect(screen.getByText("CRM System")).toBeInTheDocument();
    expect(screen.queryByText("Liam Hayes")).not.toBeInTheDocument();
    expect(screen.queryByText("Open in Team time")).not.toBeInTheDocument();
    expect(useHoursReport).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ME }),
    );
  });

  it("opens the week of a working day with no time", () => {
    showMyTime(peopleReport([myRow]));

    expect(
      screen.getByRole("link", { name: /Wed 14: no time logged/ }),
    ).toHaveAttribute("href", "/timesheet?week=2026-10-14");
  });

  it("shows the rest of the month as days to come, with a day off already on them", () => {
    showMyTime(peopleReport([myRow]));

    const wednesday = screen.getByText("Wed 28").parentElement;
    expect(wednesday).toHaveClass("border-dashed", "bg-stripes-day-off");
    expect(wednesday).toHaveTextContent("Sick");
    expect(screen.getByText("Fri 30").parentElement).toHaveClass(
      "border-dashed",
    );
    expect(screen.getByText("Still to come")).toBeInTheDocument();
  });

  it("rings today, the day after the last one counted", () => {
    showMyTime({ ...peopleReport([myRow]), countedUntil: "2026-10-22" });

    const today = screen.getByText(/Fri 23 · Today/).parentElement;
    expect(today).toHaveClass("border-brand");
    expect(today).toHaveTextContent("Counts tomorrow");
  });

  it("treats a locked month as done: its days lead nowhere and its gap is only less than expected", () => {
    showMyTime({ ...peopleReport([myRow]), isProvisional: false });

    expect(screen.getByText("16h less than expected")).toBeInTheDocument();
    expect(screen.getByText("1 day with no time logged")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /no time logged/ }),
    ).not.toBeInTheDocument();
  });

  it("says so when the person has nothing in the month, with the way to the timesheet", () => {
    showMyTime(peopleReport([]));

    expect(
      screen.getByText("Nothing logged in October 2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open the timesheet" }),
    ).toHaveAttribute("href", "/timesheet");
  });

  it("says nothing is counted yet when no day of the month has finished", () => {
    showMyTime({ ...peopleReport([myRow]), countedUntil: "2026-09-30" });

    expect(screen.getByText("Nothing counted yet")).toBeInTheDocument();
  });

  it("steps back to the company's first month and comes back to this one", async () => {
    const user = userEvent.setup();
    showMyTime(peopleReport([myRow]));
    expect(
      screen.queryByRole("button", { name: "Back to this month" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    expect(usePeopleReport).toHaveBeenLastCalledWith({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    });

    await user.click(
      screen.getByRole("button", { name: "Back to this month" }),
    );

    expect(screen.getByText("October 2026")).toBeInTheDocument();
  });
});
