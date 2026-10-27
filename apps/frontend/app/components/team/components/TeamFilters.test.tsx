import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Project } from "@/types";
import { ProjectStatus } from "@/types/enums";

import { TeamFilters } from "./TeamFilters";

const project = (id: string, name: string, status: ProjectStatus) =>
  ({ id, name, status }) as Project;

vi.mock("@/hooks/useTeams", () => ({
  useTeamOptions: () => ({ options: [] }),
}));
vi.mock("@/hooks/useProjects", () => ({
  useAllProjectsQuery: () => ({
    items: [
      project("p-legacy", "Legacy CRM", ProjectStatus.ARCHIVED),
      project("p-northwind", "Northwind", ProjectStatus.ACTIVE),
      project("p-launch", "Launch site", ProjectStatus.COMPLETED),
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
      "Launch site (completed)",
    ]);

    await user.click(
      screen.getByRole("option", { name: "Legacy CRM (archived)" }),
    );
    expect(onProjectChange).toHaveBeenCalledWith("p-legacy");
  });
});
