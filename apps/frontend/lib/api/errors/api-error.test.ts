import { describe, expect, it } from "vitest";

import { UnusableInvitationCode } from "@/types/enums";

import { isUnusableInvitationError } from "./api-error";

describe("isUnusableInvitationError", () => {
  it.each(Object.values(UnusableInvitationCode))(
    "recognises %s, a code the invitation routes send",
    (code) => {
      expect(
        isUnusableInvitationError({ statusCode: 400, message: "", code }),
      ).toBe(true);
    },
  );

  it.each([
    { statusCode: 404, message: "Not found" },
    { statusCode: 400, code: "SOMETHING_ELSE" },
    new TypeError("Failed to fetch"),
    null,
  ])("treats %p as a failed request", (error) => {
    expect(isUnusableInvitationError(error)).toBe(false);
  });
});
