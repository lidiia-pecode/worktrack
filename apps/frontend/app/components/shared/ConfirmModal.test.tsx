import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmModal } from "./ConfirmModal";

const renderModal = (loading: boolean) =>
  render(
    <ConfirmModal
      isOpen
      title="Log time on a weekend?"
      confirmText="Log time"
      onConfirm={vi.fn()}
      onClose={vi.fn()}
      loading={loading}
    />,
  );

describe("ConfirmModal", () => {
  it("offers both choices while idle", async () => {
    renderModal(false);

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Log time" })).toBeEnabled();
  });

  it("locks both choices while the action runs", async () => {
    renderModal(true);

    expect(
      await screen.findByRole("button", { name: "Cancel" }),
    ).toBeDisabled();

    const confirm = screen.getByRole("button", { name: "Log time" });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
  });
});
