import * as z from "zod";

import { optionalNoteSchema } from "@/lib/forms/schemas/note.schema";

import { isOnPlanStep } from "../plan-minutes";

const minutesOf = ({ hours, minutes }: { hours: number; minutes: number }) =>
  Number(hours) * 60 + Number(minutes);

/** A plan to add, as the lines under the planned rows hold it. */
export const addedLineSchema = z
  .object({
    projectId: z.string(),
    hours: z.coerce.number().min(0).max(24),
    minutes: z.coerce.number().min(0).max(59),
    note: optionalNoteSchema.optional(),
  })
  .refine((data) => isOnPlanStep(data.minutes), {
    message: "Plan in 15-minute steps",
    path: ["hours"],
  })
  // A line left blank is ignored; one with a project needs hours, and hours a project.
  .refine((data) => !data.projectId || minutesOf(data) > 0, {
    message: "Enter hours greater than 0",
    path: ["hours"],
  })
  .refine((data) => data.projectId || minutesOf(data) === 0, {
    message: "Select a project",
    path: ["projectId"],
  });

export type AddedLine = z.infer<typeof addedLineSchema>;

export const EMPTY_LINE: AddedLine = { projectId: "", hours: 0, minutes: 0 };

export const addedLineMinutes = minutesOf;
