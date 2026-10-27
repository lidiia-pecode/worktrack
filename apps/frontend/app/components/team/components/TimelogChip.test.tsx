import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimeLog } from "@/types";

import { TimelogChip } from "./TimelogChip";

const TIMELOG = {
  id: "log-1",
  userId: "user-alice",
  minutes: 90,
  isBillable: true,
  date: "2026-11-02",
  createdAt: "2026-11-02T09:00:00Z",
  updatedAt: "2026-11-02T09:00:00Z",
  projectActivity: {
    project: { id: "project-crm", name: "CRM System" },
    activity: { name: "Code review" },
  },
} as TimeLog;

describe("TimelogChip", () => {
  it("shows the duration and the project, and opens the entry", () => {
    const onClick = vi.fn();
    render(
      <TimelogChip
        timelog={TIMELOG}
        onClick={onClick}
        onHover={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    const block = screen.getByRole("button", {
      name: "1h 30m CRM System, edit this entry",
    });
    expect(block).toHaveTextContent("1h 30mCRM System");

    fireEvent.click(block);
    expect(onClick).toHaveBeenCalledWith(TIMELOG);
  });

  it("is not a button when read-only, but shows its details on focus", () => {
    const onHover = vi.fn();
    render(
      <TimelogChip timelog={TIMELOG} onHover={onHover} onLeave={vi.fn()} />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    const block = screen.getByLabelText("1h 30m CRM System");
    fireEvent.focus(block);
    expect(onHover).toHaveBeenCalledWith(TIMELOG, block);
  });
});
