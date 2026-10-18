import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResourceFormModal } from "./ResourceFormModal";

const renderModal = (hasUnsavedChanges: boolean) => {
  const onClose = vi.fn();

  render(
    <ResourceFormModal
      open
      onClose={onClose}
      title="Log time"
      hasUnsavedChanges={hasUnsavedChanges}
    >
      <input aria-label="Note" />
    </ResourceFormModal>,
  );

  return { onClose };
};

describe("ResourceFormModal", () => {
  it("closes at once when nothing has changed", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal(false);

    await user.click(await screen.findByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("dialog", { name: "Discard your changes?" }),
    ).not.toBeInTheDocument();
  });

  it("asks before Escape discards a changed form", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal(true);

    await user.click(await screen.findByRole("textbox", { name: "Note" }));
    await user.keyboard("{Escape}");

    expect(
      await screen.findByRole("dialog", { name: "Discard your changes?" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Discard" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the form open when the person keeps editing", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal(true);

    await user.click(await screen.findByRole("button", { name: "Close" }));
    await user.click(
      await screen.findByRole("button", { name: "Keep editing" }),
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Log time" }),
    ).toBeInTheDocument();
  });
});
