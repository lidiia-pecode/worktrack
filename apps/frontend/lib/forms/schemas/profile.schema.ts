import { z } from "zod";

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(50, "Username must be less than 50 characters"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
