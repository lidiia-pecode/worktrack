import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useManageListState } from "@/hooks/useManageListState";

import { ManageToolbar } from "./ManageToolbar";

const navigation = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/projects",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const SEARCH_PAUSE_MS = 300;

const Harness = () => {
  const listState = useManageListState();

  return (
    <>
      <ManageToolbar
        title="Projects"
        listState={listState}
        panelId="projects-panel"
        archivedLabel="Archived"
        searchPlaceholder="Search projects..."
      />
      <output aria-label="Search sent">{listState.searchQuery ?? ""}</output>
    </>
  );
};

const searchSent = () => screen.getByRole("status", { name: "Search sent" });

describe("ManageToolbar", () => {
  beforeEach(() => {
    vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    navigation.search = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("opens on the tab named in the URL", () => {
    navigation.search = "tab=archived";
    render(<Harness />);

    expect(screen.getByRole("tab", { name: "Archived" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps the tab in the URL alongside other parameters", async () => {
    const user = userEvent.setup();
    navigation.search = "onboarding=true";
    render(<Harness />);

    await user.click(screen.getByRole("tab", { name: "Archived" }));
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/admin/projects?onboarding=true&tab=archived",
    );

    await user.click(screen.getByRole("tab", { name: "Active" }));
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/admin/projects?onboarding=true",
    );
  });

  it("sends the search once typing pauses, trimmed", () => {
    vi.useFakeTimers();
    render(<Harness />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  web " },
    });
    expect(searchSent()).toBeEmptyDOMElement();

    act(() => vi.advanceTimersByTime(SEARCH_PAUSE_MS));
    expect(searchSent()).toHaveTextContent("web");
  });
});
