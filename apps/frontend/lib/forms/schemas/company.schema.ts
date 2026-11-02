import { WeekDay } from "@/types/enums";
import { z } from "zod";

import { companyNameSchema } from "./names.schema";
import { workDayHoursSchema } from "./work-day.schema";

export const companySchema = z.object({
  companyName: companyNameSchema,

  timezone: z.string().min(1, "Choose a time zone"),

  weekStartDay: z.enum(WeekDay),

  standardWorkHoursPerDay: workDayHoursSchema(1),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
