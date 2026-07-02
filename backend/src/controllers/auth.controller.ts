import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/mail.service';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../services/activity.service';

const generateAccessToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '24h',
  });
};

const generateRefreshToken = async (userId: string) => {
  const token = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: '7d',
  });
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token,
    userId,
    expiresAt,
  });

  return token;
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
};

const checkOtpRequestLimit = async (user: any): Promise<boolean> => {
  const now = new Date();
  if (user.otpRequestsResetTime && user.otpRequestsResetTime < now) {
    user.otpRequestsCount = 0;
  }

  if ((user.otpRequestsCount || 0) >= 5 && user.otpRequestsResetTime && user.otpRequestsResetTime > now) {
    return false;
  }

  user.otpRequestsCount = (user.otpRequestsCount || 0) + 1;
  if (user.otpRequestsCount === 1) {
    user.otpRequestsResetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }
  return true;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, usn, email, password, branch, year } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { usn }] });
    if (userExists) {
      if (!userExists.isVerified) {
        // Throttling check
        const allowed = await checkOtpRequestLimit(userExists);
        if (!allowed) {
          return res.status(429).json({ message: 'Maximum 5 OTP requests per hour exceeded. Please try again later.' });
        }

        // Regenerate and resend OTP
        const otp = generateOtp();
        userExists.otpHash = await bcrypt.hash(otp, 10);
        userExists.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
        userExists.otpAttempts = 0;
        await userExists.save();

        try {
          await sendOtpEmail(userExists.email, otp, userExists.name);
        } catch (mailError) {
          console.error('[Registration Controller] Failed to send OTP email:', mailError);
        }

        return res.status(403).json({
          unverified: true,
          email: userExists.email,
          message: 'Account not verified. A new OTP has been sent.',
        });
      }

      console.warn(`[Registration Controller] Registration rejected. User already exists with email: ${email} or USN: ${usn}`);
      return res.status(400).json({ message: 'User with this Email or USN already exists' });
    }

    // Hash password with salt rounds = 12
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Create user (unverified initially)
    const user = await User.create({
      name,
      usn,
      email,
      passwordHash,
      branch,
      year,
      otpHash,
      otpExpires,
      otpAttempts: 0,
      otpRequestsCount: 1,
      otpRequestsResetTime: new Date(Date.now() + 60 * 60 * 1000),
      isVerified: false,
    });

    // Send verification email
    try {
      await sendOtpEmail(email, otp, name);
    } catch (mailError) {
      console.error('[Registration Controller] Verification OTP email sending failed:', mailError);
      // We don't fail registration if mail fails in dev, or we can propagate the error
    }

    // Audit log
    try {
      await logActivity(user._id, 'User Registration', 'User', user._id.toString());
    } catch (auditError) {
      console.error('[Registration Controller] Failed to log activity:', auditError);
    }
    return res.status(201).json({
      message: 'Registration successful. Verification OTP sent to your email.',
      email: user.email,
    });
  } catch (error: any) {
    console.error('[Registration Controller] Critical server error during registration:', error);
    return res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message || error 
    });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    // OTP Expiry check
    if (!user.otpHash || !user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Attempts lockout check
    if ((user.otpAttempts || 0) >= 3) {
      return res.status(400).json({ message: 'Maximum incorrect OTP attempts exceeded. Please request a new OTP.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await logActivity(user._id, 'Failed OTP Attempt', 'User', user._id.toString(), { attempt: user.otpAttempts });
      if (user.otpAttempts >= 3) {
        user.otpHash = undefined;
        user.otpExpires = undefined;
      }
      await user.save();
      return res.status(400).json({
        message: `Invalid OTP. Attempt ${user.otpAttempts} of 3. ${
          user.otpAttempts >= 3 ? 'This OTP is now invalidated.' : ''
        }`,
      });
    }

    // Update user to verified and clear verification fields
    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    // Generate accessToken & refreshToken
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await generateRefreshToken(user._id.toString());

    // Audit log
    await logActivity(user._id, 'OTP Verified', 'User', user._id.toString());

    return res.status(200).json({
      message: 'Account verified successfully!',
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        usn: user.usn,
        email: user.email,
        branch: user.branch,
        year: user.year,
        skills: user.skills,
        domains: user.domains,
        availability: user.availability,
        openToInvitations: user.openToInvitations,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    // Find by email OR usn
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { usn: identifier.toUpperCase() },
      ],
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isDeleted || user.deletedAt) {
      return res.status(400).json({ message: 'Account has been deleted.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logActivity(user._id, 'Failed Login', 'User', user._id.toString(), { identifier });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      // Check resend throttling limits
      const allowed = await checkOtpRequestLimit(user);
      if (!allowed) {
        return res.status(429).json({ message: 'Maximum 5 OTP requests per hour exceeded. Please try again later.' });
      }

      // Regenerate and resend OTP
      const otp = generateOtp();
      user.otpHash = await bcrypt.hash(otp, 10);
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
      user.otpAttempts = 0;
      await user.save();

      await sendOtpEmail(user.email, otp, user.name);

      return res.status(403).json({
        message: 'Account not verified. A new OTP has been sent to your email.',
        unverified: true,
        email: user.email,
      });
    }

    // Generate accessToken & refreshToken
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await generateRefreshToken(user._id.toString());

    // Audit log
    await logActivity(user._id, 'Login', 'User', user._id.toString());

    return res.status(200).json({
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        usn: user.usn,
        email: user.email,
        branch: user.branch,
        year: user.year,
        skills: user.skills,
        domains: user.domains,
        availability: user.availability,
        openToInvitations: user.openToInvitations,
        githubProfile: user.githubProfile,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    // Check request throttling limits
    const allowed = await checkOtpRequestLimit(user);
    if (!allowed) {
      return res.status(429).json({ message: 'Maximum 5 OTP requests per hour exceeded. Please try again later.' });
    }

    const otp = generateOtp();
    user.otpHash = await bcrypt.hash(otp, 10);
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
    user.otpAttempts = 0;
    await user.save();

    await sendOtpEmail(user.email, otp, user.name);

    return res.status(200).json({ message: 'OTP resent successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during resending OTP' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Check if token exists in DB
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Verify user is not deleted
    const user = await User.findById(tokenDoc.userId);
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'User not found or deleted' });
    }

    // Token reuse detection / revocation check
    if (tokenDoc.isUsed || tokenDoc.isRevoked || tokenDoc.expiresAt < new Date()) {
      // Invalidate ALL tokens for this user as a safety precaution if reused
      if (tokenDoc.isUsed) {
        await RefreshToken.updateMany({ userId: tokenDoc.userId }, { isRevoked: true });
        return res.status(403).json({ message: 'Security Alert: Refresh token has already been used. Session revoked.' });
      }
      return res.status(401).json({ message: 'Revoked or expired refresh token' });
    }

    // Verify signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { userId: string };
    } catch (err) {
      return res.status(401).json({ message: 'Invalid refresh token signature' });
    }

    // Mark current token as used
    tokenDoc.isUsed = true;
    await tokenDoc.save();

    // Generate new Access and Refresh tokens
    const newAccessToken = generateAccessToken(tokenDoc.userId.toString());
    const newRefreshToken = await generateRefreshToken(tokenDoc.userId.toString());

    return res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

// Forgot Password: Send verification code to @bmsce.ac.in email
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Always return a generic message to prevent user enumeration
    const genericResponse = { message: 'If an account exists, a reset code has been sent.' };
    
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (!user) {
      return res.status(200).json(genericResponse);
    }
    
    // Generate secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save bcrypt hash and 10 minutes expiry
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    
    // Send email code
    await sendPasswordResetEmail(user.email, otp, user.name);
    
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('[forgotPassword error]', error);
    return res.status(500).json({ message: 'Server error during forgot password' });
  }
};

// Reset Password using verified OTP code
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, password } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (!user || !user.resetOtpHash || !user.resetOtpExpiry) {
      return res.status(400).json({ message: 'Invalid request or reset code has expired.' });
    }
    
    // Verify OTP expiry
    if (new Date() > user.resetOtpExpiry) {
      user.resetOtpHash = undefined;
      user.resetOtpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }
    
    // Compare code hash
    const isMatch = await bcrypt.compare(otp, user.resetOtpHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }
    
    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    
    // Clear reset credentials
    user.resetOtpHash = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();
    
    // Revoke all previous refresh sessions
    await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });
    
    return res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error) {
    console.error('[resetPassword error]', error);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
};
