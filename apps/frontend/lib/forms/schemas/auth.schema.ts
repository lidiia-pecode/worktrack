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

export const googleSignupSchema = z.object({
  companyName: companyNameSchema,
});

export type GoogleSignupFormInputs = z.infer<typeof googleSignupSchema>;
