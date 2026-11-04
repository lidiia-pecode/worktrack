import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResourceFormModal } from "./ResourceFormModal";

const renderModal = (
  props: Partial<React.ComponentProps<typeof ResourceFormModal>> = {},
) =>
  render(
    <ResourceFormModal
      open
      onClose={vi.fn()}
      title="Log time"
      description="Jane Smith · Wednesday, November 4"
      footer={<button type="button">Cancel</button>}
      {...props}
    >
      <p>Body</p>
    </ResourceFormModal>,
  );

describe("ResourceFormModal", () => {
  it("names the dialog by its action, with who and when beneath, and no close button", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "Log time" });
    expect(dialog).toHaveAccessibleDescription(
      "Jane Smith · Wednesday, November 4",
    );
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("keeps the header's end for a control", () => {
    renderModal({ headerEnd: <input aria-label="Duration" /> });

    expect(
      screen.getByRole("textbox", { name: "Duration" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("asks before discarding unsaved changes on Escape, and closes at once otherwise", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = renderModal({ onClose, hasUnsavedChanges: true });

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("heading", { name: "Discard your changes?" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();

    const onCloseClean = vi.fn();
    renderModal({ onClose: onCloseClean });
    await user.keyboard("{Escape}");
    expect(onCloseClean).toHaveBeenCalledOnce();
  });

  it("ignores Escape while a save is in flight", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose, isBusy: true });

    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Log time" }),
    ).toBeInTheDocument();
  });

  it("keeps the form open when the person keeps editing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose, hasUnsavedChanges: true });

    await user.keyboard("{Escape}");
    await user.click(
      await screen.findByRole("button", { name: "Keep editing" }),
    );

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Log time" }),
    ).toBeInTheDocument();
  });
});
