import { z } from "zod";

import { personNameSchema } from "./names.schema";

export const profileSchema = z.object({
  firstName: personNameSchema("First name"),

  lastName: personNameSchema("Last name"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
