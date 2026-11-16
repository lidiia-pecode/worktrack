import { z } from "zod";

import { emailSchema } from "./email.schema";
import { companyNameSchema, personNameSchema } from "./names.schema";
import { existingPasswordSchema, newPasswordSchema } from "./password.schema";

export const loginSchema = z.object({
  email: emailSchema,
  password: existingPasswordSchema,
});

export const signupSchema = z.object({
  firstName: personNameSchema("First name"),
  lastName: personNameSchema("Last name"),
  companyName: companyNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export type LoginFormInputs = z.infer<typeof loginSchema>;
export type SignUpFormInputs = z.infer<typeof signupSchema>;

export const invitationSchema = z.object({
  firstName: personNameSchema("First name"),
  lastName: personNameSchema("Last name"),
  password: newPasswordSchema,
});

export type InvitationFormInputs = z.infer<typeof invitationSchema>;

// The page shows a name field only when Google didn't share that name; a
// field it doesn't show stays undefined.
export const googleSignupSchema = z.object({
  firstName: personNameSchema("First name").optional(),
  lastName: personNameSchema("Last name").optional(),
  companyName: companyNameSchema,
});

export type GoogleSignupFormInputs = z.infer<typeof googleSignupSchema>;
