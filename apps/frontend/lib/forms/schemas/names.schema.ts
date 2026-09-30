import { z } from "zod";

// Mirrors the backend rules in src/lib/validators/account-fields.ts.
export const personNameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be at most 100 characters`);

export const companyNameSchema = z
  .string()
  .trim()
  .min(1, "Company name is required")
  .min(2, "Company name must be at least 2 characters")
  .max(100, "Company name must be at most 100 characters");
