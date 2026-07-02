import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { extractErrorMessage } from '../../services/api';
import { Input } from '../../components/common/Input';
import { Check, X as XIcon } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Countdown timer for Resending OTP
  const [countdown, setCountdown] = useState(60);

  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validations
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isMatch = password === confirmPassword && password.length > 0;
  const isOtpValid = otp.length === 6;

  const isFormValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial && isMatch && isOtpValid && emailParam;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isFormValid) {
      setError('Please resolve all validation errors first.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: emailParam,
        otp,
        password,
      });
      setSuccess(res.data.message || 'Password reset successfully.');
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to reset password. Please verify the code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || !emailParam) return;
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email: emailParam });
      setSuccess('A new OTP has been sent successfully.');
      setCountdown(60);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to resend OTP.'));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-3 text-reddit-text dark:text-reddit-textDark font-sans">Reset Password</h2>
      <p className="text-xs text-reddit-gray mb-4 font-sans leading-normal">
        Please verify the 6-digit OTP code sent to your email to configure your new password.
      </p>

      {error && <div className="mb-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded">{error}</div>}
      {success && <div className="mb-3 text-xs bg-green-500/10 border border-green-500/30 text-green-500 p-2 rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address Read-Only */}
        <Input
          label="BMSCE Email (Read-only)"
          type="email"
          readOnly
          disabled
          value={emailParam}
          className="bg-reddit-bg/60 dark:bg-reddit-bgDark/60 cursor-not-allowed opacity-80"
        />

        {/* 6-Digit OTP */}
        <Input
          label="6-Digit OTP"
          type="text"
          maxLength={6}
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="text-center font-bold tracking-[8px] text-sm"
        />

        {/* New Password */}
        <Input
          label="New Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {/* Confirm Password */}
        <Input
          label="Confirm New Password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />

        {/* Password strength checklist */}
        <div className="bg-reddit-bg dark:bg-reddit-bgDark p-3 border border-reddit-border dark:border-reddit-borderDark rounded text-[10px] space-y-1.5 font-sans leading-relaxed">
          <p className="font-bold text-reddit-gray uppercase tracking-wider mb-1">Password Strength Checklist:</p>
          <div className="flex items-center gap-1.5">
            {hasLength ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-red-500" />}
            <span className={hasLength ? 'text-green-500' : 'text-reddit-gray'}>At least 8 characters</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasUpper ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-red-500" />}
            <span className={hasUpper ? 'text-green-500' : 'text-reddit-gray'}>One uppercase letter (A-Z)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasLower ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-red-500" />}
            <span className={hasLower ? 'text-green-500' : 'text-reddit-gray'}>One lowercase letter (a-z)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasNumber ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-red-500" />}
            <span className={hasNumber ? 'text-green-500' : 'text-reddit-gray'}>One number (0-9)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasSpecial ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-red-500" />}
            <span className={hasSpecial ? 'text-green-500' : 'text-reddit-gray'}>One special character (!@#...)</span>
          </div>
          <div className="flex items-center gap-1.5 border-t border-reddit-border/20 pt-1.5 mt-1">
            {isMatch ? <Check className="h-3.5 w-3.5 text-green-500" /> : <XIcon className="h-3.5 w-3.5 text-red-500" />}
            <span className={isMatch ? 'text-green-500' : 'text-reddit-gray'}>Passwords match</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full h-10 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-xs font-sans">
        <button
          onClick={handleResendOtp}
          disabled={countdown > 0}
          className="text-reddit-blue hover:underline disabled:opacity-50 disabled:no-underline font-semibold"
        >
          {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
        </button>
        <Link to="/auth/login" className="text-reddit-gray hover:underline font-semibold">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
