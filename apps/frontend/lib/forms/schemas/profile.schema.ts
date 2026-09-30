import { z } from "zod";

import { personNameSchema } from "./names.schema";

export const profileSchema = z.object({
  firstName: personNameSchema("First name"),

  lastName: personNameSchema("Last name"),

  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
