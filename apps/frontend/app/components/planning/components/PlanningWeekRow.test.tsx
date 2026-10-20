import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlanningWeekRow as Row } from "@/types";
import { UserStatus } from "@/types/enums";
import { getWeekDates } from "@/lib/utils/date";

import { PlanningWeekRow } from "./PlanningWeekRow";

const WEEK_DATES = getWeekDates(new Date("2026-11-02T00:00:00"));

const row = (status = UserStatus.ACTIVE): Row => ({
  user: {
    id: "user-alice",
    firstName: "Alice",
    lastName: "Cooper",
    email: "alice@example.com",
    position: "Designer",
    status,
  },
  plannedMinutes: 0,
  availableMinutes: 2400,
  projects: [],
  entries: [],
});

const renderRow = (status?: UserStatus) => {
  const onPlanPeriod = vi.fn();
  render(
    <table>
      <tbody>
        <PlanningWeekRow
          row={row(status)}
          weekDates={WEEK_DATES}
          absencesByDate={{}}
          isLocked={() => false}
          isEditable={() => true}
          onOpenDay={vi.fn()}
          onPlanPeriod={onPlanPeriod}
        />
      </tbody>
    </table>,
  );
  return { onPlanPeriod };
};

describe("PlanningWeekRow", () => {
  it("plans a period from the person's cell", async () => {
    const user = userEvent.setup();
    const { onPlanPeriod } = renderRow();

    await user.click(
      screen.getByRole("button", { name: "Plan a period for Alice Cooper" }),
    );

    expect(onPlanPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: "user-alice" }),
      }),
    );
  });

  it("offers no period for a deactivated person", () => {
    renderRow(UserStatus.DEACTIVATED);

    expect(screen.getByText("Alice Cooper")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Plan a period/ }),
    ).not.toBeInTheDocument();
  });
});
