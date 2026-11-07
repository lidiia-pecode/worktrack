import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Project } from "@/types";
import { ProjectStatus, UserRole } from "@/types/enums";

import { TeamFilters } from "./TeamFilters";

const project = (id: string, name: string, status: ProjectStatus) =>
  ({ id, name, status }) as Project;

vi.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ user: { role: UserRole.OWNER } }),
}));
vi.mock("@/hooks/useTeams", () => ({
  useTeamOptions: () => ({ options: [] }),
}));
vi.mock("@/hooks/useProjects", () => ({
  useAllProjectsQuery: () => ({
    items: [
      project("p-legacy", "Legacy CRM", ProjectStatus.ARCHIVED),
      project("p-northwind", "Northwind", ProjectStatus.ACTIVE),
    ],
  }),
}));

describe("TeamFilters", () => {
  it("lists active projects first, then past ones with their status", async () => {
    const onProjectChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TeamFilters onTeamChange={vi.fn()} onProjectChange={onProjectChange} />,
    );

    await user.click(screen.getByRole("combobox", { name: "Project" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "All projects",
      "Northwind",
      "Legacy CRM (archived)",
    ]);

    await user.click(
      screen.getByRole("option", { name: "Legacy CRM (archived)" }),
    );
    expect(onProjectChange).toHaveBeenCalledWith("p-legacy");
  });

  it("offers Clear filters only while a filter or a search is set", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TeamFilters onTeamChange={vi.fn()} onClear={onClear} />,
    );

    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();

    rerender(
      <TeamFilters onTeamChange={vi.fn()} search="reed" onClear={onClear} />,
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("lists active projects only when asked", async () => {
    const user = userEvent.setup();
    render(
      <TeamFilters
        onTeamChange={vi.fn()}
        onProjectChange={vi.fn()}
        activeProjectsOnly
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Project" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "All projects",
      "Northwind",
    ]);
  });
});
