import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOpenedEntry } from "./useOpenedEntry";

// The router follows the browser's history, as Next's does for pushState.
vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const PersonPage = () => {
  const { opened, open } = useOpenedEntry(["person"]);

  return (
    <>
      <button type="button" onClick={() => open("person", "emma")}>
        Emma Carter
      </button>
      {opened && (
        <aside>
          <button type="button">Edit the week</button>
        </aside>
      )}
    </>
  );
};

describe("useOpenedEntry", () => {
  beforeEach(() => window.history.replaceState(null, "", "/team"));

  it("returns focus to the row when Back closes the panel", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PersonPage />);

    await user.click(screen.getByRole("button", { name: "Emma Carter" }));
    rerender(<PersonPage />);
    screen.getByRole("button", { name: "Edit the week" }).focus();

    // What Back leaves behind: the URL without the panel.
    window.history.replaceState(null, "", "/team");
    rerender(<PersonPage />);

    expect(screen.queryByRole("button", { name: "Edit the week" })).toBeNull();
    expect(screen.getByRole("button", { name: "Emma Carter" })).toHaveFocus();
  });
});
