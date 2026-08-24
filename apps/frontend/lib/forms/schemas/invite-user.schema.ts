import { UserRole } from "@/types/enums";
import z from "zod";

export const inviteUserSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(UserRole),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
