import { z } from "zod";

import { existingPasswordSchema } from "./password.schema";

export const googleLinkSchema = z.object({
  password: existingPasswordSchema,
});

export type GoogleLinkFormInputs = z.infer<typeof googleLinkSchema>;
