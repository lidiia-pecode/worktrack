import { WeekDay } from "@/types/enums";
import { z } from "zod";

export const companySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(255, "Company name must be at most 255 characters"),

  timezone: z.string().min(1, "Choose a time zone"),

  weekStartDay: z.enum(WeekDay),

  standardWorkHoursPerDay: z
    .number()
    .min(1, "Work hours must be at least 1")
    .max(24, "Work hours cannot exceed 24"),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
