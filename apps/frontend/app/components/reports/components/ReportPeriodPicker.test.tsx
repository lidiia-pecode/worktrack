import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { periodHolding, ReportPeriod } from "@/lib/utils/report-period";

import { ReportPeriodPicker } from "./ReportPeriodPicker";

const renderPicker = (period: ReportPeriod, companyFirstMonth = "2025-01") => {
  const onChange = vi.fn();
  render(
    <ReportPeriodPicker
      period={period}
      currentMonth="2026-10"
      companyFirstMonth={companyFirstMonth}
      onChange={onChange}
    />,
  );
  return onChange;
};

describe("ReportPeriodPicker", () => {
  it("steps a quarter back and forward with the arrows", async () => {
    const user = userEvent.setup();
    const onChange = renderPicker(periodHolding("quarter", "2026-10"));

    await user.click(screen.getByRole("button", { name: "Previous quarter" }));
    await user.click(screen.getByRole("button", { name: "Next quarter" }));

    expect(onChange.mock.calls).toEqual([
      [periodHolding("quarter", "2026-07")],
      [periodHolding("quarter", "2027-01")],
    ]);
  });

  it("switches unit around the month shown", async () => {
    const user = userEvent.setup();
    const onChange = renderPicker(periodHolding("month", "2025-08"));

    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Year" }));

    expect(onChange).toHaveBeenCalledWith(periodHolding("year", "2025-08"));
  });

  it("shows the current year to date", () => {
    renderPicker(periodHolding("year", "2026-10"));

    expect(screen.getByText("to date")).toBeInTheDocument();
  });

  it("can't step back past the company's first month", () => {
    renderPicker(periodHolding("month", "2025-01"));

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
  });

  it("returns from a custom range to stepping when a unit is picked", async () => {
    const user = userEvent.setup();
    const onChange = renderPicker({
      unit: "custom",
      dateFrom: "2026-09-03",
      dateTo: "2026-10-18",
    });

    expect(
      screen.queryByRole("button", { name: /Previous/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quarter" }));

    expect(onChange).toHaveBeenCalledWith(periodHolding("quarter", "2026-10"));
  });

  it("shows why a custom range is refused", () => {
    const onChange = vi.fn();
    render(
      <ReportPeriodPicker
        period={{
          unit: "custom",
          dateFrom: "2026-01-01",
          dateTo: "2027-01-02",
        }}
        currentMonth="2026-10"
        error="At most 366 days"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("At most 366 days");
  });
});
