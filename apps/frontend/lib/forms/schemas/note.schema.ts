import { z } from "zod";

// Mirrors the backend's note rule on time entries, absences and plans:
// empty, or 3 to 1000 characters.
export const NOTE_MAX_LENGTH = 1000;

export const optionalNoteSchema = z
  .string()
  .trim()
  .max(NOTE_MAX_LENGTH, `Use at most ${NOTE_MAX_LENGTH} characters`)
  .refine((value) => value.length === 0 || value.length >= 3, {
    message: "Use at least 3 characters, or leave it empty",
  });
