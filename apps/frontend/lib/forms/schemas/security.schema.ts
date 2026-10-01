import { z } from "zod";

import { newPasswordSchema } from "./password.schema";

export const createSecuritySchema = (hasPassword: boolean) =>
  z
    .object({
      currentPassword: hasPassword
        ? z.string().min(1, "Enter your current password")
        : z.string(),
      newPassword: newPasswordSchema,
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
