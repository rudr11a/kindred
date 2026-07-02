import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import { extractErrorMessage } from '../../services/api';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  
  // OTP Verification States
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const isDeleted = searchParams.get('deleted') === 'true';

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res && res.unverified) {
        setUnverifiedEmail(res.email || '');
        setIsOtpStep(true);
        setError('Your account is not yet verified. A new OTP has been sent to your email.');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(unverifiedEmail, otp);
      navigate('/');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Invalid or expired OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendOtp(unverifiedEmail);
      alert('A new OTP has been sent to your email.');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to resend OTP.'));
    }
  };

  if (isOtpStep) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-1 text-reddit-text dark:text-reddit-textDark">Verify Email</h2>
        <p className="text-xs text-reddit-gray mb-4">
          Enter the 6-digit OTP code sent to <strong className="text-reddit-text dark:text-reddit-textDark">{unverifiedEmail}</strong>
        </p>

        {error && <div className="mb-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded whitespace-pre-line">{error}</div>}

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <Input
            label="6-Digit Code"
            type="text"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="text-center font-bold tracking-[8px] text-sm"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-xs">
          <button onClick={handleResend} className="text-reddit-blue hover:underline">
            Resend Email OTP
          </button>
          <button onClick={() => setIsOtpStep(false)} className="text-reddit-gray hover:underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-reddit-text dark:text-reddit-textDark">Log In</h2>

      {isDeleted && (
        <div className="mb-4 text-xs bg-green-500/10 border border-green-500/30 text-green-500 p-3 rounded font-semibold leading-relaxed">
          Your account has been deleted successfully.
        </div>
      )}

      {error && <div className="mb-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded whitespace-pre-line">{error}</div>}

      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <Input
          label="Email or USN"
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="1BM23CS001 or student@bmsce.ac.in"
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <div className="mt-2.5 text-right text-xs">
        <Link to="/auth/forgot-password" className="text-reddit-blue hover:underline">
          Forgot Password?
        </Link>
      </div>

      <div className="mt-4 text-center text-xs">
        <span className="text-reddit-gray">New to Kindred? </span>
        <Link to="/auth/register" className="text-reddit-blue font-semibold hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default Login;
