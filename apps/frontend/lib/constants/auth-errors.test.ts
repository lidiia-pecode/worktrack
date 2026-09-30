import { describe, expect, it } from "vitest";

import { googleErrorMessage } from "./auth-errors";

describe("googleErrorMessage", () => {
  it("says nothing when the page was not reached from a failed sign-in", () => {
    expect(googleErrorMessage(null)).toBeNull();
    expect(googleErrorMessage("")).toBeNull();
  });

  it("points an unknown Google account at the invitation email", () => {
    expect(googleErrorMessage("GOOGLE_NO_ACCOUNT")).toContain(
      "invitation email",
    );
  });

  it("falls back to a generic message for a code it does not know", () => {
    expect(googleErrorMessage("SOMETHING_NEW")).toBe(
      "Something went wrong with Google. Try again.",
    );
  });
});
