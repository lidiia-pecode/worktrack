import { describe, expect, it } from "vitest";

import { invitationSchema, loginSchema, signupSchema } from "./auth.schema";
import { companySchema } from "./company.schema";
import { googleLinkSchema } from "./google-link.schema";
import { WeekDay } from "@/types/enums";

const VALID_SIGN_UP = {
  firstName: "Emma",
  lastName: "Clarke",
  companyName: "Clarke Studio",
  email: "emma.clarke@example.com",
  password: "Secret123",
};

describe("account rules match the backend", () => {
  it.each(["secret123", "SECRET123", "SecretPass", "Sec123"])(
    "refuses the new password %s on sign-up and invitation",
    (password) => {
      expect(
        signupSchema.safeParse({ ...VALID_SIGN_UP, password }).success,
      ).toBe(false);
      expect(
        invitationSchema.safeParse({
          firstName: "Liam",
          lastName: "Turner",
          password,
          confirmPassword: password,
        }).success,
      ).toBe(false);
    },
  );

  it("checks an existing password only for presence", () => {
    expect(
      loginSchema.safeParse({ email: "a@example.com", password: "short" })
        .success,
    ).toBe(true);
    expect(googleLinkSchema.safeParse({ password: "short" }).success).toBe(
      true,
    );
    expect(googleLinkSchema.safeParse({ password: "" }).success).toBe(false);
  });

  it("accepts one-letter names and trims them", () => {
    const result = signupSchema.safeParse({
      ...VALID_SIGN_UP,
      firstName: " J ",
      lastName: "O",
    });

    expect(result.success && result.data.firstName).toBe("J");
  });

  it.each(["Smith & Co", "Kyiv-Tech", "Студія Кларк"])(
    "accepts the company name %s",
    (companyName) => {
      expect(
        signupSchema.safeParse({ ...VALID_SIGN_UP, companyName }).success,
      ).toBe(true);
    },
  );

  it("refuses a company name over 100 characters in Settings", () => {
    expect(
      companySchema.safeParse({
        companyName: "x".repeat(101),
        timezone: "Europe/Kyiv",
        weekStartDay: WeekDay.MONDAY,
        standardWorkHoursPerDay: 8,
      }).success,
    ).toBe(false);
  });
});
