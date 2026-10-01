import { z } from "zod";

import { emailSchema } from "./email.schema";
import { newPasswordSchema } from "./password.schema";

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  newPassword: newPasswordSchema,
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
