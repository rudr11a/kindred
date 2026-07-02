import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, verifyOtp, login, resendOtp, getMe, refresh, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, verifyOtpSchema, loginSchema, resendOtpSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many registration requests from this IP. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { message: 'Too many login attempts from this IP. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many OTP verification attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpResendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many OTP resend requests. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many forgot password requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many password reset attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), verifyOtp);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/resend-otp', otpResendLimiter, validate(resendOtpSchema), resendOtp);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
