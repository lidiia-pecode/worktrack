import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(255, "Team name is too long"),
});

export type CreateTeamFormValues = z.infer<typeof createTeamSchema>;
