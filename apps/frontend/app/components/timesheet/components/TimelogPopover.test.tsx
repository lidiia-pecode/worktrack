import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeLog } from "@/types";

import { TimelogPopover } from "./TimelogPopover";

const timelog = (isBillable: boolean) =>
  ({
    id: "log-1",
    userId: "user-alice",
    minutes: 240,
    isBillable,
    note: "Review of the contacts import",
    date: "2026-11-02",
    createdAt: "2026-11-02T09:00:00Z",
    updatedAt: "2026-11-02T09:00:00Z",
    projectActivity: {
      project: { id: "project-crm", name: "CRM System" },
      activity: { name: "Code review" },
    },
  }) as TimeLog;

const renderCard = (isBillable: boolean) =>
  render(
    <TimelogPopover
      timelog={timelog(isBillable)}
      anchor={document.createElement("div")}
    />,
  );

describe("TimelogPopover", () => {
  it("shows the project, activity, time and note, but not the date", () => {
    renderCard(true);

    const card = screen.getByRole("tooltip");
    expect(card).toHaveTextContent("CRM System");
    expect(card).toHaveTextContent("Code review");
    expect(card).toHaveTextContent("4h");
    expect(card).toHaveTextContent("Review of the contacts import");
    expect(card).not.toHaveTextContent(/Nov|2 /);
  });

  it("tags a non-billable entry", () => {
    renderCard(false);
    expect(screen.getByText("Non-billable")).toBeInTheDocument();
  });

  it("tags nothing on a billable entry", () => {
    renderCard(true);
    expect(screen.queryByText("Non-billable")).not.toBeInTheDocument();
  });
});
