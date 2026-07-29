import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(3, 'Too short')
    .max(20),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(3, 'Too short')
    .max(20),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Too short')
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Invalid username'),
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;
export type SignUpFormInputs = z.infer<typeof signupSchema>;
