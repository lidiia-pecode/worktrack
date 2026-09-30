import { describe, expect, it } from "vitest";

import { isUnusableInvitationError } from "./api-error";

describe("isUnusableInvitationError", () => {
  it("recognises the codes the invitation routes send", () => {
    expect(
      isUnusableInvitationError({
        statusCode: 400,
        message: "Invitation has expired",
        code: "INVITATION_EXPIRED",
      }),
    ).toBe(true);
  });

  it.each([
    { statusCode: 404, message: "Not found" },
    { statusCode: 400, code: "SOMETHING_ELSE" },
    new TypeError("Failed to fetch"),
    null,
  ])("treats %p as a failed request", (error) => {
    expect(isUnusableInvitationError(error)).toBe(false);
  });
});
