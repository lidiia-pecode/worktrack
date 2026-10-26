import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WeekSummary } from "./WeekSummary";

const HOUR = 60;

describe("WeekSummary", () => {
  it("shows the week against expected and how far past it, and opens the breakdown", async () => {
    const user = userEvent.setup();
    render(
      <WeekSummary
        billableMinutes={5 * HOUR}
        nonBillableMinutes={32.5 * HOUR}
        expectedMinutes={32 * HOUR}
        daysOff={["Fri 23, public holiday"]}
        weekendMinutes={10 * HOUR}
      />,
    );
    const summary = screen.getByRole("button", { name: /week's breakdown/ });
    expect(summary).toHaveTextContent("37h 30m / 32h");
    expect(summary).toHaveTextContent("+5h 30m");

    await user.click(summary);

    const breakdown = await screen.findByRole("dialog");
    expect(breakdown).toHaveTextContent(
      "Lower for days off: Fri 23, public holiday",
    );
    expect(breakdown).toHaveTextContent("Billable5h · 13%");
    expect(breakdown).toHaveTextContent("5h 30m of it at the weekend");
  });

  it("says Complete when the week is exactly what was expected", () => {
    render(
      <WeekSummary
        billableMinutes={0}
        nonBillableMinutes={40 * HOUR}
        expectedMinutes={40 * HOUR}
        daysOff={[]}
        weekendMinutes={0}
      />,
    );

    expect(
      screen.getByRole("button", { name: /week's breakdown/ }),
    ).toHaveTextContent("Complete");
  });
});
