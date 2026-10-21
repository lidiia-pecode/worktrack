import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HoursReportRow } from "@/types";
import { HoursReportGroupBy } from "@/types/enums";

import { HoursReportTable } from "./HoursReportTable";
import { PeopleReportTable } from "./PeopleReportTable";

const HOUR = 60;

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
