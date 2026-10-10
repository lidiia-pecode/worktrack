import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EntityRef, formatEntityRef } from "@/lib/utils/entity-ref";

import { useEntityPanel } from "./entity-panel-context";
import { EntityPanelProvider } from "./EntityPanelProvider";

const PATHNAME = "/admin/teams";

// The URL as Next.js reports it, updated by the history calls below.
const navigation = vi.hoisted(() => {
  const listeners = new Set<() => void>();

  return {
    search: "",
    listeners,
    setSearch(search: string) {
      this.search = search;
      listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");

  return {
    usePathname: () => PATHNAME,
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (listener) => {
            navigation.listeners.add(listener);
            return () => navigation.listeners.delete(listener);
          },
          () => navigation.search,
        ),
      ),
  };
});

// These tests are about the URL and the trail, not what the panel draws.
vi.mock("./EntityPanel", () => ({ EntityPanel: () => null }));

const TEAM: EntityRef = { type: "team", id: "t-1" };
const PERSON: EntityRef = { type: "user", id: "u-1" };
const PROJECT: EntityRef = { type: "project", id: "p-1" };

const Probe = () => {
  const panel = useEntityPanel();

  return (
    <>
      <output aria-label="Open">
        {panel.current ? formatEntityRef(panel.current) : ""}
      </output>
      <output aria-label="Back to">{panel.previous?.name ?? ""}</output>
      <output aria-label="Editing">{panel.isEditing ? "yes" : ""}</output>
      <output aria-label="View">{panel.view ?? ""}</output>
      <button onClick={() => panel.openView("add-people", "Core team")}>
        Add people
      </button>
      <button onClick={() => panel.open(TEAM)}>Open team row</button>
      <button onClick={() => panel.edit(TEAM)}>Edit team row</button>
      <button onClick={() => panel.setHasUnsavedChanges(true)}>
        Change a field
      </button>
      <button onClick={() => panel.open(PROJECT)}>Open project row</button>
      <button onClick={() => panel.follow(PERSON, "Core team")}>
        Follow person
      </button>
      <button onClick={() => panel.follow(PROJECT, "John Doe")}>
        Follow project
      </button>
      <button onClick={panel.back}>Back</button>
      <button onClick={panel.close}>Close</button>
    </>
  );
};

const renderPanel = () =>
  render(
    <EntityPanelProvider>
      <Probe />
    </EntityPanelProvider>,
  );

const shown = () => screen.getByRole("status", { name: "Open" });
const backTo = () => screen.getByRole("status", { name: "Back to" });
const editing = () => screen.getByRole("status", { name: "Editing" });
const view = () => screen.getByRole("status", { name: "View" });

describe("EntityPanelProvider", () => {
  let historyEntries: string[];

  const toSearch = (url: string) => new URL(url, "http://x").search;

  beforeEach(() => {
    historyEntries = [];

    vi.spyOn(window.history, "pushState").mockImplementation((_, __, url) => {
      historyEntries.push(navigation.search);
      navigation.setSearch(toSearch(String(url)));
    });
    vi.spyOn(window.history, "replaceState").mockImplementation((_, __, url) =>
      navigation.setSearch(toSearch(String(url))),
    );
    vi.spyOn(window.history, "back").mockImplementation(() =>
      navigation.setSearch(historyEntries.pop() ?? ""),
    );
  });

  afterEach(() => {
    navigation.search = "";
    vi.restoreAllMocks();
  });

  it("opens from a list with a history entry, which closing goes back over", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open team row" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(window.history.pushState).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(window.history.back).toHaveBeenCalledOnce();
    expect(shown()).toBeEmptyDOMElement();
  });

  it("builds a trail from links inside the panel, which Back walks", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open team row" }));
    await user.click(screen.getByRole("button", { name: "Follow person" }));
    await user.click(screen.getByRole("button", { name: "Follow project" }));

    expect(shown()).toHaveTextContent("project:p-1");
    expect(backTo()).toHaveTextContent("John Doe");
    // Only opening from the list adds to the browser's history.
    expect(window.history.pushState).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(shown()).toHaveTextContent("user:u-1");
    expect(backTo()).toHaveTextContent("Core team");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(backTo()).toBeEmptyDOMElement();
  });

  it("starts a new trail when another row is opened", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open team row" }));
    await user.click(screen.getByRole("button", { name: "Follow person" }));
    await user.click(screen.getByRole("button", { name: "Open project row" }));

    expect(shown()).toHaveTextContent("project:p-1");
    expect(backTo()).toBeEmptyDOMElement();
  });

  it("closes a panel it found in the URL without leaving the page", async () => {
    const user = userEvent.setup();
    navigation.search = `?open=${formatEntityRef(TEAM)}`;
    renderPanel();

    expect(shown()).toHaveTextContent("team:t-1");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(window.history.back).not.toHaveBeenCalled();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      PATHNAME,
    );
  });

  it("opens an entity in its form from a row, and leaving it ends the edit", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Edit team row" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(editing()).toHaveTextContent("yes");

    await user.click(screen.getByRole("button", { name: "Follow person" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(editing()).toBeEmptyDOMElement();
  });

  it("asks before leaving unsaved changes", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Edit team row" }));
    await user.click(screen.getByRole("button", { name: "Change a field" }));
    await user.click(screen.getByRole("button", { name: "Follow person" }));

    expect(
      await screen.findByRole("dialog", { name: "Discard your changes?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(editing()).toHaveTextContent("yes");

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    expect(shown()).toBeEmptyDOMElement();
    expect(editing()).toBeEmptyDOMElement();
  });

  it("puts a view such as a picker on the trail, which Back leaves", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open team row" }));
    await user.click(screen.getByRole("button", { name: "Add people" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(view()).toHaveTextContent("add-people");
    expect(backTo()).toHaveTextContent("Core team");

    // A link from the picker comes back to it.
    await user.click(screen.getByRole("button", { name: "Follow person" }));
    expect(view()).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(view()).toHaveTextContent("add-people");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(shown()).toHaveTextContent("team:t-1");
    expect(view()).toBeEmptyDOMElement();
    expect(backTo()).toBeEmptyDOMElement();
  });
});
