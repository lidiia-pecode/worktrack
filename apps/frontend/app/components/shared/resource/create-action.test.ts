import { describe, expect, it } from "vitest";

import { createActionPlacement } from "./create-action";

const listed = {
  canCreate: true,
  isLoading: false,
  isError: false,
  itemCount: 3,
  isSearching: false,
};

describe("createActionPlacement", () => {
  it("puts the button in the toolbar beside the search while items are listed", () => {
    expect(createActionPlacement(listed)).toBe("toolbar");
  });

  it("leaves it to the empty state while the list is truly empty", () => {
    expect(createActionPlacement({ ...listed, itemCount: 0 })).toBe(
      "emptyState",
    );
  });

  it("keeps it in the toolbar when a search finds nothing or loading failed", () => {
    expect(
      createActionPlacement({ ...listed, itemCount: 0, isSearching: true }),
    ).toBe("toolbar");
    expect(
      createActionPlacement({ ...listed, itemCount: 0, isError: true }),
    ).toBe("toolbar");
  });

  it("shows nothing while loading or when the person cannot create", () => {
    expect(createActionPlacement({ ...listed, isLoading: true })).toBeNull();
    expect(createActionPlacement({ ...listed, canCreate: false })).toBeNull();
  });
});
