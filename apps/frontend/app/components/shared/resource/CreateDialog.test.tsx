import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateDialog } from "./CreateDialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const renderDialog = (
  props: Partial<React.ComponentProps<typeof CreateDialog>> = {},
) => {
  const onClose = vi.fn();
  render(
    <CreateDialog
      open
      onClose={onClose}
      title="New project"
      formId="create-form"
      submitLabel="Create project"
      isSubmitting={false}
      {...props}
    >
      <form id="create-form">
        <input aria-label="Project name" />
      </form>
    </CreateDialog>,
  );
  return { onClose };
};

describe("CreateDialog", () => {
  it("closes at once from Cancel or Escape while nothing was typed", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("asks before Escape drops a typed name, and Cancel never asks", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({ hasUnsavedChanges: true });

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("heading", { name: "Discard your changes?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
