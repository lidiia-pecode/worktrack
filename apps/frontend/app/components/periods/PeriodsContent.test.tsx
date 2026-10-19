import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportingMonth } from "@/types";
import { ReportingMonthState } from "@/types/enums";

import { PeriodsContent } from "./PeriodsContent";

const month = (
  key: string,
  state: ReportingMonthState,
  change?: { by: string; at: string },
): ReportingMonth => ({
  month: key,
  state,
  editableUntil: null,
  changedBy: change?.by ?? null,
  changedAt: change?.at ?? null,
});

const months = [
  month("2026-10", ReportingMonthState.OPEN),
  month("2026-09", ReportingMonthState.LOCKED),
  month("2026-08", ReportingMonthState.REOPENED, {
    by: "Owner Test",
    at: "2026-10-19T12:00:00.000Z",
  }),
];

let hasOlder = false;
const close = { mutate: vi.fn(), isPending: false };
const reopen = { mutate: vi.fn(), isPending: false };

vi.mock("@/hooks/useReportingPeriods", () => ({
  useReportingPeriodHistory: () => ({
    months,
    hasOlder,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    loadOlder: vi.fn(),
    isLoadingOlder: false,
  }),
  useReportingPeriodMutations: () => ({ reopen, close }),
}));

vi.mock("@/hooks/auth/useCompany", () => ({
  useCompany: () => ({ company: { timezone: "UTC" } }),
}));

describe("PeriodsContent", () => {
  beforeEach(() => {
    hasOlder = false;
    close.mutate.mockClear();
  });

  it("asks before closing a reopened month", async () => {
    const user = userEvent.setup();
    render(<PeriodsContent />);

    await user.click(screen.getByRole("button", { name: "Close August 2026" }));
    expect(close.mutate).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("heading", { name: "Close August 2026?" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Close month" }));
    expect(close.mutate).toHaveBeenCalledOnce();
    expect(close.mutate.mock.calls[0][0]).toBe("2026-08");
  });

  it("says who last changed a month, and nothing for the others", () => {
    render(<PeriodsContent />);

    expect(screen.getByText(/^Owner Test · /)).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("offers older months only while there are some", () => {
    const { unmount } = render(<PeriodsContent />);
    expect(
      screen.queryByRole("button", { name: "Show older" }),
    ).not.toBeInTheDocument();
    unmount();

    hasOlder = true;
    render(<PeriodsContent />);
    expect(screen.getByRole("button", { name: "Show older" })).toBeVisible();
  });
});
