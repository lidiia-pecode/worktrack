import { UserRole } from "@/types/enums";
import z from "zod";

/** An employee always joins the company into a team. */
export const inviteUserSchema = z
  .object({
    email: z.email("Enter a valid email address"),
    role: z.enum(UserRole),
    teamId: z.uuid().optional(),
  })
  .refine((data) => data.role !== UserRole.EMPLOYEE || Boolean(data.teamId), {
    path: ["teamId"],
    message: "Select a team",
  });

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
