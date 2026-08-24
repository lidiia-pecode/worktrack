import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(3, "Too short")
    .max(20),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(3, "Too short")
    .max(20),

  companyName: z
    .string()
    .min(1, "Company name is required")
    .min(2, "Too short")
    .max(100, "Too long"),

  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;
export type SignUpFormInputs = z.infer<typeof signupSchema>;

export const invitationSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(2, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type InvitationFormInputs = z.infer<typeof invitationSchema>;
