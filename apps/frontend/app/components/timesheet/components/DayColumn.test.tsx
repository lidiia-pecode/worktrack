import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimeLog } from "@/types";

import { DayColumn } from "./DayColumn";

const entry: TimeLog = {
  id: "log-1",
  userId: "user-1",
  isBillable: true,
  minutes: 90,
  note: "Sprint review",
  date: "2026-10-14",
  createdAt: "2026-10-14T09:00:00Z",
  updatedAt: "2026-10-14T09:00:00Z",
};

const renderDay = (timelogs: TimeLog[]) => (
  <DayColumn
    date={new Date("2026-10-14T00:00:00")}
    timelogs={timelogs}
    plannedEntries={[]}
    isAbsenceLocked={false}
    totalMinutes={timelogs.reduce((sum, log) => sum + log.minutes, 0)}
    pixelsPerMinute={1}
    expectedMinutes={480}
    isLocked={false}
    isEditable
    onAddClick={vi.fn()}
    onAbsenceClick={vi.fn()}
    onEntryClick={vi.fn()}
  />
);

describe("DayColumn", () => {
  it("drops an entry's hover card once the entry is deleted", async () => {
    const user = userEvent.setup();
    const { rerender } = render(renderDay([entry]));

    await user.hover(screen.getByRole("button", { name: /^1h 30m/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Sprint review");

    rerender(renderDay([]));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
