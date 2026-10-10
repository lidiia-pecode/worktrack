import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Archive } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { EntityPanelContext } from "../../entity-panel/entity-panel-context";
import { mockEntityPanel } from "../../entity-panel/mock-entity-panel";
import { countLabel, ManageList, ManageRowDefinition } from "./ManageList";

interface Project {
  id: string;
  name: string;
  clientName: string | null;
  membersCount: number;
}

const projects: Project[] = [
  { id: "p-1", name: "Website", clientName: "Acme", membersCount: 3 },
  { id: "p-2", name: "Handbook", clientName: null, membersCount: 1 },
];

const buildRow = (
  overrides: Partial<ManageRowDefinition<Project>> = {},
): ManageRowDefinition<Project> => ({
  getKey: (project) => project.id,
  getName: (project) => project.name,
  getEntity: (project) => ({ type: "project", id: project.id }),
  onEdit: vi.fn(),
  columns: [
    {
      header: "Client",
      width: "w-48",
      cell: (project) => project.clientName ?? "Internal",
      // An internal project says nothing about a client on a phone.
      summary: (project) => project.clientName,
    },
    {
      header: "People",
      width: "w-24",
      numeric: true,
      cell: (project) => project.membersCount,
      summary: (project) =>
        countLabel(project.membersCount, "person", "people"),
    },
  ],
  getActions: () => [{ label: "Archive", icon: Archive, onSelect: vi.fn() }],
  ...overrides,
});

const renderList = (row: ManageRowDefinition<Project>) => {
  const panel = mockEntityPanel({
    hrefFor: (ref) => `?open=${ref.type}:${ref.id}`,
  });

  render(
    <EntityPanelContext.Provider value={panel}>
      <ManageList label="Projects" items={projects} row={row} />
    </EntityPanelContext.Provider>,
  );

  return panel;
};

// jsdom ignores the breakpoint classes, so both layouts are in the document.
const table = () => screen.getByRole("table", { name: "Projects" });
const phoneList = () => screen.getByRole("list", { name: "Projects" });

describe("ManageList", () => {
  it("renders the table and the phone list from one row definition", () => {
    renderList(buildRow());

    expect(
      within(table())
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Name", "Client", "People", "Actions"]);
    expect(
      within(table()).getByRole("rowheader", { name: "Website" }),
    ).toBeInTheDocument();
    expect(within(table()).getByText("Internal")).toBeInTheDocument();

    const [website, handbook] = within(phoneList()).getAllByRole("listitem");
    expect(website).toHaveTextContent("Acme · 3 people");
    expect(handbook).toHaveTextContent("1 person");
    expect(handbook).not.toHaveTextContent("·");
  });

  it("opens the entity from the row or its name, once per click", async () => {
    const user = userEvent.setup();
    const panel = renderList(buildRow());

    await user.click(within(table()).getByText("Acme"));
    expect(panel.open).toHaveBeenLastCalledWith({ type: "project", id: "p-1" });
    // Focus goes to the name, which closing the panel returns to.
    expect(
      within(table()).getByRole("link", { name: "Website" }),
    ).toHaveFocus();

    const handbook = within(table()).getByRole("link", { name: "Handbook" });
    expect(handbook).toHaveAttribute("href", "?open=project:p-2");

    await user.click(handbook);
    expect(panel.open).toHaveBeenLastCalledWith({ type: "project", id: "p-2" });
    expect(panel.open).toHaveBeenCalledTimes(2);
  });

  it("offers Edit and the row's actions without opening the row", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const row = buildRow({
      getActions: () => [
        { label: "Archive", icon: Archive, onSelect: onArchive },
      ],
    });
    const panel = renderList(row);

    await user.click(
      within(table()).getByRole("button", { name: "Actions for Website" }),
    );

    expect(
      (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
    ).toEqual(["Edit", "Archive"]);

    await user.click(screen.getByRole("menuitem", { name: "Archive" }));

    expect(onArchive).toHaveBeenCalledOnce();
    expect(panel.open).not.toHaveBeenCalled();
    expect(row.onEdit).not.toHaveBeenCalled();
  });

  it("shows no menu when the viewer can do nothing with the row", () => {
    renderList(buildRow({ canEdit: () => false, getActions: () => [] }));

    expect(
      within(table()).queryByRole("button", { name: "Actions for Website" }),
    ).not.toBeInTheDocument();
  });
});
