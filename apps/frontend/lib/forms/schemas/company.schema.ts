import { CompanyCurrency, WeekDay } from "@/types/enums";
import { z } from "zod";

export const companySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),

  timezone: z.string().min(1, "Timezone is required"),

  currency: z.enum(CompanyCurrency),

  weekStartDay: z.enum(WeekDay),

  standardWorkHoursPerDay: z
    .number()
    .min(1, "Work hours must be at least 1")
    .max(24, "Work hours cannot exceed 24"),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
