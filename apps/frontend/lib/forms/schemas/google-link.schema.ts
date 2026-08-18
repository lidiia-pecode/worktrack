import { z } from "zod";

export const googleLinkSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/,
      "Password must contain at least one uppercase letter and number",
    ),
});

export type GoogleLinkFormInputs = z.infer<typeof googleLinkSchema>;
