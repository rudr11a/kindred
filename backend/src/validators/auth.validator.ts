import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  usn: z
    .string()
    .toUpperCase()
    .regex(/^1BM\d{2}[A-Z]{2}\d{3}$/, 'Invalid USN format. Must be like 1BM23CS001'),
  email: z
    .string()
    .toLowerCase()
    .regex(/^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/, 'Only @bmsce.ac.in emails are allowed'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  branch: z.string().min(1, 'Branch is required'),
  year: z.number().min(1).max(4, 'Year must be between 1 and 4'),
});

export const verifyOtpSchema = z.object({
  email: z.string().toLowerCase().regex(/^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or USN is required'), // can be email or USN
  password: z.string().min(1, 'Password is required'),
});

export const resendOtpSchema = z.object({
  email: z.string().toLowerCase().regex(/^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/, 'Invalid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().toLowerCase().regex(/^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/, 'Only @bmsce.ac.in emails are allowed'),
});

export const resetPasswordSchema = z.object({
  email: z.string().toLowerCase().regex(/^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/, 'Only @bmsce.ac.in emails are allowed'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
});
