import { z } from "zod";

import { newPasswordSchema } from "./password.schema";

// An account created with Google has no password yet, so it has no current one to enter.
export const createSecuritySchema = (hasPassword: boolean) =>
  z
    .object({
      currentPassword: hasPassword
        ? z.string().min(1, "Enter your current password")
        : z.string(),
      newPassword: newPasswordSchema,
      confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    })
    .refine(
      (data) => !hasPassword || data.newPassword !== data.currentPassword,
      {
        message: "Choose a password different from your current one",
        path: ["newPassword"],
      },
    );

export type SecurityFormValues = z.infer<
  ReturnType<typeof createSecuritySchema>
>;
