import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

describe.each(["page", "compact"] as const)("%s states", (size) => {
  it("announces loading with its title", () => {
    render(<LoadingState size={size} title="Loading periods" />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading periods");
  });

  it("announces an error and retries on request", async () => {
    const onRetry = vi.fn();
    render(<ErrorState size={size} title="Could not load" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers no retry when there is nothing to retry", () => {
    render(<ErrorState size={size} title="Could not load" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
