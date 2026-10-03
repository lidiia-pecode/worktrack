import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserRole } from "@/types/enums";

import { GettingStartedLink, SidebarNavigation } from "./SidebarNavigation";
import { navigationFor } from "./sidebar-navigation";

describe("SidebarNavigation", () => {
  it("names each group and marks only the current page", () => {
    render(
      <SidebarNavigation
        groups={navigationFor(UserRole.MANAGER)}
        pathname="/admin/teams"
      />,
    );

    const manage = screen.getByRole("list", { name: "Manage" });
    const teams = within(manage).getByRole("link", { name: "Teams" });

    expect(screen.getByRole("list", { name: "Work" })).toBeInTheDocument();
    expect(teams).toHaveAttribute("aria-current", "page");
    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link.hasAttribute("aria-current")),
    ).toEqual([teams]);
  });
});

describe("GettingStartedLink", () => {
  it("asks to finish setup while it is open", () => {
    render(<GettingStartedLink isSetupOpen pathname="/team" />);

    expect(screen.getByRole("link")).toHaveAccessibleName(
      /Finish setting up your company/,
    );
  });

  it("offers the guide once setup is finished", () => {
    render(
      <GettingStartedLink isSetupOpen={false} pathname="/getting-started" />,
    );

    const link = screen.getByRole("link");

    expect(link).toHaveAccessibleName(/How WorkTrack fits together/);
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
