import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResourceCard } from "./ResourceCard";

const renderCard = () => {
  const onOpen = vi.fn();
  const onEdit = vi.fn();

  render(
    <ResourceCard
      title="Design team"
      onClick={onOpen}
      actions={
        <button type="button" onClick={onEdit}>
          Edit
        </button>
      }
    >
      Three members
    </ResourceCard>,
  );

  return { onOpen, onEdit };
};

describe("ResourceCard", () => {
  it("opens from its title by click or Enter", async () => {
    const { onOpen } = renderCard();
    const title = screen.getByRole("button", { name: "Design team" });

    await userEvent.click(title);
    title.focus();
    await userEvent.keyboard("{Enter}");

    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("runs an action without opening the card", async () => {
    const { onOpen, onEdit } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("keeps the action out of the card's button", () => {
    renderCard();

    expect(
      screen.getByRole("button", { name: "Design team" }),
    ).not.toContainElement(screen.getByRole("button", { name: "Edit" }));
  });
});
