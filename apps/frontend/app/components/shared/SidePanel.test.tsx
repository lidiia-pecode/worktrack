import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SidePanel } from "./SidePanel";

// jsdom has no matchMedia; each test picks the desktop aside or the drawer.
const viewport = vi.hoisted(() => ({ isDesktop: true }));

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => viewport.isDesktop,
}));

const renderPanel = (onClose = vi.fn()) => {
  render(
    <SidePanel titleId="panel-title" focusKey="person-1" onClose={onClose}>
      <h2 id="panel-title">Jane Smith</h2>
      <button type="button">Inside</button>
    </SidePanel>,
  );

  return onClose;
};

describe("SidePanel", () => {
  it("is labelled by its heading and takes focus when it opens", () => {
    viewport.isDesktop = true;
    renderPanel();

    const panel = screen.getByRole("complementary", { name: "Jane Smith" });
    expect(panel).toHaveFocus();
  });

  it("closes on Escape from inside the panel", async () => {
    viewport.isDesktop = true;
    const user = userEvent.setup();
    const onClose = renderPanel();

    await user.click(screen.getByRole("button", { name: "Inside" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is a dialog below the desktop breakpoint", () => {
    viewport.isDesktop = false;
    renderPanel();

    expect(
      screen.getByRole("dialog", { name: "Jane Smith" }),
    ).toBeInTheDocument();
  });
});
