import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("keeps a hidden title as the page's one h1, with its description shown", () => {
    render(
      <PageHeader
        title="Periods"
        hideTitle
        description="Each month locks by itself."
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Periods" }),
    ).toHaveClass("sr-only");
    expect(screen.getByText("Each month locks by itself.")).toBeVisible();
  });

  it("shows the title when it is not hidden", () => {
    render(<PageHeader title="How WorkTrack fits together" />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "How WorkTrack fits together",
      }),
    ).not.toHaveClass("sr-only");
  });
});
