import { z } from "zod";

import { newPasswordSchema } from "./password.schema";

export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
