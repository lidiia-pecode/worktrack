import { UserRole } from "@/types/enums";
import z from "zod";

export const inviteUserSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(UserRole),
  teamId: z.uuid().optional(),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;

/** A manager may only invite into a team they lead, so the field is required for them. */
export const createInviteUserSchema = (teamRequired: boolean) =>
  teamRequired
    ? inviteUserSchema.refine((data) => Boolean(data.teamId), {
        path: ["teamId"],
        message: "Select a team",
      })
    : inviteUserSchema;
