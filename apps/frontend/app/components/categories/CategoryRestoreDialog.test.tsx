import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActivityCategoryDetails } from "@/types";
import {
  ActCategoryStatus,
  ActivityStatus,
  ArchivedActivitiesAction,
} from "@/types/enums";

import { EntityPanelContext } from "../entity-panel/entity-panel-context";
import { mockEntityPanel } from "../entity-panel/mock-entity-panel";
import { CategoryRestoreDialog } from "./CategoryRestoreDialog";

const restore = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));

vi.mock("@/hooks/useActivityCategories", () => ({
  useRestoreActivityCategory: () => restore,
}));

const panel = mockEntityPanel();

const design: ActivityCategoryDetails = {
  id: "c-1",
  companyId: "co-1",
  name: "Design",
  status: ActCategoryStatus.ARCHIVED,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  activities: [
    {
      id: "a-1",
      name: "Wireframes",
      status: ActivityStatus.ARCHIVED,
      isInUse: false,
    },
    {
      id: "a-2",
      name: "Research",
      status: ActivityStatus.ARCHIVED,
      isInUse: false,
    },
    {
      id: "a-3",
      name: "Reviews",
      status: ActivityStatus.ACTIVE,
      isInUse: true,
    },
  ],
};

const renderDialog = () =>
  render(
    <EntityPanelContext.Provider value={panel}>
      <CategoryRestoreDialog category={design} onClose={vi.fn()} />
    </EntityPanelContext.Provider>,
  );

describe("CategoryRestoreDialog", () => {
  beforeEach(() => restore.mutate.mockClear());

  it("names only the archived activities", async () => {
    renderDialog();

    expect(
      await screen.findByRole("link", { name: "Wireframes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Research" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Reviews" }),
    ).not.toBeInTheDocument();
  });

  it("restores the activities with the category by default", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole("button", { name: "Restore" }));

    expect(restore.mutate).toHaveBeenCalledWith(
      { id: "c-1", payload: { activities: ArchivedActivitiesAction.RESTORE } },
      expect.anything(),
    );
  });

  it("restores the category alone when chosen", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole("combobox"));
    await user.click(
      await screen.findByRole("option", { name: "Restore the category alone" }),
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(restore.mutate).toHaveBeenCalledWith(
      { id: "c-1", payload: {} },
      expect.anything(),
    );
  });
});
