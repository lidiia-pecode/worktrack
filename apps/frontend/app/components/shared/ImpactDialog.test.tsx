import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  EntityPanelContext,
  EntityPanelContextValue,
} from "../entity-panel/entity-panel-context";
import { ImpactDialog } from "./ImpactDialog";

const panel: EntityPanelContextValue = {
  current: null,
  previous: null,
  open: vi.fn(),
  follow: vi.fn(),
  back: vi.fn(),
  close: vi.fn(),
  hrefFor: (ref) => `?open=${ref.type}:${ref.id}`,
};

const WEBSITE = {
  entity: { type: "project", id: "p-1" },
  name: "Website",
} as const;

const renderDialog = (
  props: Partial<ComponentProps<typeof ImpactDialog>> = {},
) => {
  const handlers = { onConfirm: vi.fn(), onClose: vi.fn() };

  render(
    <EntityPanelContext.Provider value={panel}>
      <ImpactDialog
        isOpen
        title="Archive Backend?"
        description="Nobody can log new time on it."
        confirmText="Archive"
        {...handlers}
        {...props}
      />
    </EntityPanelContext.Provider>,
  );

  return handlers;
};

describe("ImpactDialog", () => {
  it("lists what the action touches, leaving out empty groups", async () => {
    renderDialog({
      affected: [
        { label: "Projects that lose it", entities: [WEBSITE] },
        { label: "Left without a team", entities: [] },
      ],
    });

    expect(
      await screen.findByRole("link", { name: "Website" }),
    ).toHaveAttribute("href", "?open=project:p-1");
    expect(screen.getByText("Projects that lose it")).toBeInTheDocument();
    expect(screen.queryByText("Left without a team")).not.toBeInTheDocument();
  });

  it("closes and opens the entity in the panel when a link is followed", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog({
      affected: [{ label: "Projects that lose it", entities: [WEBSITE] }],
    });

    await user.click(await screen.findByRole("link", { name: "Website" }));

    expect(onClose).toHaveBeenCalled();
    expect(panel.open).toHaveBeenCalledWith(WEBSITE.entity);
  });

  it("only explains when something blocks the action", async () => {
    renderDialog({ blocker: "Make someone else the manager first." });

    expect(
      await screen.findByText("Make someone else the manager first."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Got it" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Archive" }),
    ).not.toBeInTheDocument();
  });

  it("holds the action until its impact has loaded", async () => {
    renderDialog({ confirmDisabled: true });

    expect(
      await screen.findByRole("button", { name: "Archive" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });
});
