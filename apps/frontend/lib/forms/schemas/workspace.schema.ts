import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  timezone: z.string().min(1, "Timezone is required"),
  currency: z.string().length(3, "Currency must be a 3-letter code"),
  standardWorkHoursPerDay: z
    .number()
    .min(1, "Minimum 1 hour per day")
    .max(24, "Maximum 24 hours per day"),
});

export type UpdateCompanyInputs = z.infer<typeof updateCompanySchema>;
