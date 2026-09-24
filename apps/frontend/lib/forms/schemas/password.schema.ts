import { z } from "zod";

export const PASSWORD_RULES_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter and a number.";

export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be maximum 100 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");
