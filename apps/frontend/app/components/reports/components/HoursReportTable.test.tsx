import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HoursReportRow } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";

import { useHoursReport } from "@/hooks/useHoursReport";

import { HoursReportTable } from "./HoursReportTable";
import { PeopleReportTable } from "./PeopleReportTable";

const HOUR = 60;
const OCTOBER = { dateFrom: "2026-10-01", dateTo: "2026-10-31" };

vi.mock("@/hooks/useHoursReport", () => ({ useHoursReport: vi.fn() }));

const project = (
  name: string,
  totalHours: number,
  plannedHours: number | null,
): HoursReportRow => ({
  id: name,
  name,
  detail: "Acme",
  billableMinutes: totalHours * HOUR,
  nonBillableMinutes: 0,
  totalMinutes: totalHours * HOUR,
  plannedMinutes: plannedHours === null ? null : plannedHours * HOUR,
});

const rowNames = () =>
  screen
    .getAllByRole("rowheader")
    .map((cell) => cell.textContent?.replace("Acme", "").trim());

describe("HoursReportTable", () => {
  const rows = [
    project("CRM rebuild", 140, 180),
    project("Mobile app", 112, 96),
  ];
  const totals = {
    billableMinutes: 252 * HOUR,
    nonBillableMinutes: 0,
    totalMinutes: 252 * HOUR,
    plannedMinutes: 276 * HOUR,
  };

  it("leads with the period's totals, then the rows", () => {
    render(
      <HoursReportTable
        groupBy={HoursReportGroupBy.PROJECT}
        rows={rows}
        totals={totals}
        range={OCTOBER}
        periodText="October 2026"
      />,
    );

    expect(
      screen.getByRole("table", { name: "Projects, October 2026" }),
    ).toBeInTheDocument();
    expect(rowNames()).toEqual([
      "All projects2 projects",
      "CRM rebuild",
      "Mobile app",
    ]);
    expect(screen.getByText("24h less than planned")).toBeInTheDocument();
    expect(screen.getByText("40h less than planned")).toBeInTheDocument();
    expect(screen.getByText("16h more than planned")).toBeInTheDocument();
  });

  it("has no plan columns by activity", () => {
    render(
      <HoursReportTable
        groupBy={HoursReportGroupBy.ACTIVITY}
        rows={[project("Backend", 10, null)]}
        totals={{ ...totals, plannedMinutes: null }}
        range={OCTOBER}
        periodText="October 2026"
      />,
    );

    expect(
      screen.queryByRole("columnheader", { name: /Planned/ }),
    ).not.toBeInTheDocument();
  });

  it("sorts by a column, turns it around, and keeps the totals first", async () => {
    const user = userEvent.setup();
    render(
      <HoursReportTable
        groupBy={HoursReportGroupBy.PROJECT}
        rows={rows}
        totals={totals}
        range={OCTOBER}
        periodText="October 2026"
      />,
    );

    const againstPlan = screen.getByRole("button", { name: /Against plan/ });
    await user.click(againstPlan);
    expect(rowNames().slice(1)).toEqual(["Mobile app", "CRM rebuild"]);
    expect(
      screen.getByRole("columnheader", { name: /Against plan/ }),
    ).toHaveAttribute("aria-sort", "descending");

    await user.click(againstPlan);
    expect(rowNames()).toEqual([
      "All projects2 projects",
      "CRM rebuild",
      "Mobile app",
    ]);
  });
});

describe("opening a row to its people", () => {
  const person = (name: string, totalHours: number, plannedHours: number) => ({
    ...project(name, totalHours, plannedHours),
    detail: "Developer",
  });

  beforeEach(() => {
    vi.mocked(useHoursReport).mockReturnValue({
      report: {
        groupBy: HoursReportGroupBy.PERSON,
        rows: [person("Member Test", 84, 84), person("Grace Morgan", 16, 40)],
        totals: {
          billableMinutes: 100 * HOUR,
          nonBillableMinutes: 0,
          totalMinutes: 100 * HOUR,
          plannedMinutes: 124 * HOUR,
        },
        isProvisional: false,
        countedUntil: null,
      },
      isLoading: false,
      isPlaceholderData: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHoursReport>);
  });

  const renderProjects = () =>
    render(
      <HoursReportTable
        groupBy={HoursReportGroupBy.PROJECT}
        rows={[project("CRM rebuild", 140, 180)]}
        totals={{
          billableMinutes: 140 * HOUR,
          nonBillableMinutes: 0,
          totalMinutes: 140 * HOUR,
          plannedMinutes: 180 * HOUR,
        }}
        range={OCTOBER}
        periodText="October 2026"
      />,
    );

  it("shows who worked on a project, with their plans, and hides them again", async () => {
    const user = userEvent.setup();
    renderProjects();

    await user.click(
      screen.getByRole("button", { name: "Show people on CRM rebuild" }),
    );

    expect(useHoursReport).toHaveBeenCalledWith({
      ...OCTOBER,
      groupBy: HoursReportGroupBy.PERSON,
      projectId: "CRM rebuild",
    });
    const grace = screen.getByRole("row", { name: /Grace Morgan/ });
    expect(
      within(grace).getByText("24h less than planned"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide people on CRM rebuild" }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.click(
      screen.getByRole("button", { name: "Hide people on CRM rebuild" }),
    );
    expect(
      screen.queryByRole("row", { name: /Grace Morgan/ }),
    ).not.toBeInTheDocument();
  });

  it("opens internal work as the projects with no client", async () => {
    const user = userEvent.setup();
    render(
      <HoursReportTable
        groupBy={HoursReportGroupBy.CLIENT}
        rows={[{ ...project("x", 10, 0), id: null, name: null }]}
        totals={{
          billableMinutes: 0,
          nonBillableMinutes: 10 * HOUR,
          totalMinutes: 10 * HOUR,
          plannedMinutes: 0,
        }}
        range={OCTOBER}
        periodText="October 2026"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Show people on Internal work" }),
    );

    expect(useHoursReport).toHaveBeenCalledWith(
      expect.objectContaining({ withoutClient: true }),
    );
  });

  it("says when the people are still loading", async () => {
    vi.mocked(useHoursReport).mockReturnValue({
      report: null,
      isLoading: true,
      isPlaceholderData: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useHoursReport>);
    const user = userEvent.setup();
    renderProjects();

    await user.click(
      screen.getByRole("button", { name: "Show people on CRM rebuild" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading the people…");
  });

  it("doesn't open activities", () => {
    render(
      <HoursReportTable
        groupBy={HoursReportGroupBy.ACTIVITY}
        rows={[project("Backend", 10, null)]}
        totals={{
          billableMinutes: 10 * HOUR,
          nonBillableMinutes: 0,
          totalMinutes: 10 * HOUR,
          plannedMinutes: null,
        }}
        range={OCTOBER}
        periodText="October 2026"
      />,
    );

    expect(
      screen.queryByRole("button", { name: /Show people/ }),
    ).not.toBeInTheDocument();
  });
});

describe("PeopleReportTable", () => {
  it("compares each person with what was expected, with their days off", () => {
    render(
      <PeopleReportTable
        rows={[
          {
            userId: "ethan",
            name: "Ethan Brooks",
            position: "DevOps engineer",
            loggedMinutes: 79 * HOUR,
            billableMinutes: 70 * HOUR,
            nonBillableMinutes: 9 * HOUR,
            plannedMinutes: 64 * HOUR,
            expectedMinutes: 72 * HOUR,
            timeOffDays: 0,
          },
          {
            userId: "grace",
            name: "Grace Morgan",
            position: null,
            loggedMinutes: 40 * HOUR,
            billableMinutes: 30 * HOUR,
            nonBillableMinutes: 10 * HOUR,
            plannedMinutes: 64 * HOUR,
            expectedMinutes: 64 * HOUR,
            timeOffDays: 3,
          },
        ]}
        totals={{
          loggedMinutes: 119 * HOUR,
          billableMinutes: 100 * HOUR,
          nonBillableMinutes: 19 * HOUR,
          plannedMinutes: 128 * HOUR,
          expectedMinutes: 136 * HOUR,
          timeOffDays: 3,
        }}
        periodText="October 2026"
      />,
    );

    const ethan = screen.getByRole("row", { name: /Ethan Brooks/ });
    expect(
      within(ethan).getByText("7h more than expected"),
    ).toBeInTheDocument();
    const grace = screen.getByRole("row", { name: /Grace Morgan/ });
    expect(
      within(grace).getByText("24h less than expected"),
    ).toBeInTheDocument();
    expect(within(grace).getByText("3 days")).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: /Everyone/ }),
    ).toHaveTextContent("2 people");
  });
});
