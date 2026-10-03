import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { User } from "@/types";
import { UserRole, UserStatus } from "@/types/enums";

import { Sidebar } from "./Sidebar";

const navigation = vi.hoisted(() => ({ pathname: "/timesheet" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

// The account menu has its own data; these tests are about the phone menu.
vi.mock("./UserMenu", () => ({ UserMenu: () => null }));

vi.mock("@/hooks/auth/useOnboarding", () => ({
  useOwnerSetupState: () => ({ data: undefined }),
}));

const employee: User = {
  id: "user-1",
  companyId: "company-1",
  role: UserRole.EMPLOYEE,
  status: UserStatus.ACTIVE,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  googleLinked: false,
  hasPassword: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const openMenu = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

  return screen.findByRole("dialog", { name: "Menu" });
};

describe("Sidebar phone menu", () => {
  beforeEach(() => {
    navigation.pathname = "/timesheet";
  });

  it("closes on Escape and returns focus to the menu button", async () => {
    render(<Sidebar user={employee} />);

    await openMenu();
    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("closes once the page changes, whatever started the navigation", async () => {
    const { rerender } = render(<Sidebar user={employee} />);

    await openMenu();
    navigation.pathname = "/settings";
    rerender(<Sidebar user={employee} />);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
