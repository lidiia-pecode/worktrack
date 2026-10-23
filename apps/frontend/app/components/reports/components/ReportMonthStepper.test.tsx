import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { formatMonthLabel } from "@/lib/utils/date";

import { ReportMonthStepper } from "./ReportMonthStepper";

const renderStepper = (month: string) => {
  const onChange = vi.fn();
  render(
    <ReportMonthStepper
      month={month}
      currentMonth="2026-10"
      companyFirstMonth="2026-06"
      onChange={onChange}
    />,
  );
  return onChange;
};

describe("ReportMonthStepper", () => {
  it("names the month and steps back and forward, across a year end too", async () => {
    const user = userEvent.setup();
    const onChange = renderStepper("2026-08");

    expect(screen.getByText(formatMonthLabel("2026-08"))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(onChange.mock.calls).toEqual([["2026-07"], ["2026-09"]]);
  });

  it("stops at the company's first month", () => {
    renderStepper("2026-06");

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
  });

  it("stops at the current month", () => {
    renderStepper("2026-10");

    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });
});
