import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Enter your email")
  .pipe(z.email("Enter a valid email address"));
