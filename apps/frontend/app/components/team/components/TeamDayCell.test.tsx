import { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Absence, PlanningEntry, TimeLog } from "@/types";
import { AbsenceType } from "@/types/enums";

import { TeamDayCell } from "./TeamDayCell";

const MONDAY = new Date("2026-11-02T00:00:00");
const SATURDAY = new Date("2026-11-07T00:00:00");

const entry = (id: string, minutes: number, projectName: string) =>
  ({
    id,
    userId: "user-alice",
    minutes,
    isBillable: true,
    date: "2026-11-02",
    createdAt: "2026-11-02T09:00:00Z",
    updatedAt: "2026-11-02T09:00:00Z",
    projectActivity: {
      project: { id: `project-${projectName}`, name: projectName },
      activity: { name: "Design" },
    },
  }) as TimeLog;

const CRM = entry("log-1", 300, "CRM System");
const PORTAL = entry("log-2", 180, "Customer Portal");

const PLAN = {
  id: "plan-1",
  userId: "user-alice",
  date: "2026-11-02",
  plannedMinutes: 480,
  project: { id: "project-dwh", name: "Data Warehouse" },
} as PlanningEntry;

const VACATION = {
  id: "absence-1",
  userId: "user-alice",
  type: AbsenceType.VACATION,
  startDate: "2026-11-02",
  endDate: "2026-11-02",
} as Absence;

const renderCell = (props: Partial<ComponentProps<typeof TeamDayCell>> = {}) =>
  render(
    <table>
      <tbody>
        <tr>
          <TeamDayCell
            date={MONDAY}
            personName="Alice Cooper"
            entries={[]}
            minutes={0}
            expectedMinutes={480}
            isLocked={false}
            isPast
            {...props}
          />
        </tr>
      </tbody>
    </table>,
  );

describe("TeamDayCell", () => {
  it("shows a block per entry", () => {
    renderCell({ entries: [CRM, PORTAL], minutes: 480 });

    expect(screen.getByText("CRM System")).toBeInTheDocument();
    expect(screen.getByText("Customer Portal")).toBeInTheDocument();
  });

  it("makes the blocks and the + sibling buttons, never one inside another", () => {
    const { container } = renderCell({
      entries: [CRM],
      minutes: 300,
      onEditEntry: vi.fn(),
      onAdd: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: "CRM System 5h, edit this entry" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Log time for Alice Cooper on / }),
    ).toBeInTheDocument();
    expect(container.querySelector("button button")).toBeNull();
  });

  it("leaves a read-only day without buttons, its blocks still reachable", () => {
    renderCell({ entries: [CRM], minutes: 300 });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText("CRM System 5h")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("flags a finished working day without time", () => {
    renderCell();

    expect(screen.getByText("No time")).toBeInTheDocument();
  });

  it("flags nothing on a day still to come, or one that expects nothing", () => {
    renderCell({ isPast: false });
    expect(screen.queryByText("No time")).not.toBeInTheDocument();

    renderCell({ expectedMinutes: 0 });
    expect(screen.queryByText("No time")).not.toBeInTheDocument();
  });

  it("stripes an absence and offers no + on it", () => {
    renderCell({ absence: VACATION, expectedMinutes: 0, onAdd: vi.fn() });

    expect(screen.getByRole("cell")).toHaveClass("bg-stripes-day-off");
    expect(screen.getByText("Vacation")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Log time/ }),
    ).not.toBeInTheDocument();
  });

  it("marks a day over the person's hours in amber", () => {
    renderCell({ entries: [CRM, PORTAL], minutes: 480, expectedMinutes: 360 });

    expect(screen.getByRole("cell")).toHaveClass("bg-excess");
  });

  it("stripes a weekend, in amber once it has time", () => {
    renderCell({ date: SATURDAY, expectedMinutes: 0 });
    expect(screen.getByRole("cell")).toHaveClass("bg-stripes-weekend");

    renderCell({
      date: SATURDAY,
      entries: [CRM],
      minutes: 300,
      expectedMinutes: 0,
    });
    expect(screen.getAllByRole("cell")[1]).toHaveClass("bg-stripes-extra");
  });

  it("greys a locked day", () => {
    renderCell({ entries: [CRM], minutes: 300, isLocked: true });

    expect(screen.getByRole("cell")).toHaveClass("bg-muted/20");
  });

  it("folds entries past three behind +N more, and expands in place", () => {
    renderCell({
      entries: [
        CRM,
        PORTAL,
        entry("log-3", 60, "Training"),
        entry("log-4", 30, "Support Desk"),
      ],
      minutes: 570,
    });

    expect(screen.queryByText("Support Desk")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+1 more" }));

    expect(screen.getByText("Support Desk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("shows the plan on an empty day only", () => {
    renderCell({ plans: [PLAN] });
    expect(
      screen.getByLabelText("Data Warehouse, planned 8h"),
    ).toBeInTheDocument();

    renderCell({ plans: [PLAN], entries: [CRM], minutes: 300 });
    expect(screen.getAllByLabelText("Data Warehouse, planned 8h")).toHaveLength(
      1,
    );
  });

  it("edits the entry a block names, and creates from the +", () => {
    const onEditEntry = vi.fn();
    const onAdd = vi.fn();
    renderCell({ entries: [CRM, PORTAL], minutes: 480, onEditEntry, onAdd });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Customer Portal 3h, edit this entry",
      }),
    );
    expect(onEditEntry).toHaveBeenCalledWith(PORTAL);

    fireEvent.click(screen.getByRole("button", { name: /^Log time for/ }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("logs time on the planned project from the plan", () => {
    const onPlanClick = vi.fn();
    renderCell({ plans: [PLAN], onPlanClick });

    fireEvent.click(
      screen.getByRole("button", { name: /for Data Warehouse \(planned 8h\)/ }),
    );
    expect(onPlanClick).toHaveBeenCalledWith("project-dwh");
  });

  it("opens the absence from its badge", () => {
    const onAbsenceClick = vi.fn();
    renderCell({ absence: VACATION, expectedMinutes: 0, onAbsenceClick });

    fireEvent.click(
      screen.getByRole("button", { name: "Vacation, open the absence" }),
    );
    expect(onAbsenceClick).toHaveBeenCalled();
  });

  it("shows the day as busy while its form waits", () => {
    renderCell({ isBusy: true });
    expect(screen.getByRole("cell")).toHaveAttribute("aria-busy", "true");
  });

  it("shows an entry's details while its block is hovered", () => {
    renderCell({ entries: [CRM], minutes: 300 });

    fireEvent.mouseEnter(screen.getByLabelText("CRM System 5h"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Design");

    fireEvent.mouseLeave(screen.getByLabelText("CRM System 5h"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
