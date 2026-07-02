import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import { extractErrorMessage } from '../../services/api';

const Register: React.FC = () => {
  // Input fields
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('Computer Science (CS)');
  const [year, setYear] = useState(1);

  // Flow control states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState('');

  // Errors & UI states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Pre-validations
    if (!email.toLowerCase().endsWith('@bmsce.ac.in')) {
      setError('Only @bmsce.ac.in email addresses are allowed.');
      return;
    }

    if (!/^1BM\d{2}[A-Z]{2}\d{3}$/i.test(usn)) {
      setError('USN format must match student USN standard (e.g., 1BM23CS001).');
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        name,
        usn: usn.toUpperCase(),
        email: email.toLowerCase(),
        password,
        branch,
        year,
      });
      if (res && res.unverified) {
        setEmail(res.email || email.toLowerCase());
        setIsOtpStep(true);
        setError('Your account is not yet verified. A new OTP has been sent to your email.');
      } else {
        setIsOtpStep(true);
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Registration failed. Please check inputs.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email.toLowerCase(), otp);
      navigate('/');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Verification failed. Incorrect OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendOtp(email.toLowerCase());
      alert('OTP has been resent to your email.');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to resend OTP.'));
    }
  };

  if (isOtpStep) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-1 text-reddit-text dark:text-reddit-textDark">Confirm Code</h2>
        <p className="text-xs text-reddit-gray mb-4">
          OTP sent to <strong className="text-reddit-text dark:text-reddit-textDark">{email.toLowerCase()}</strong>. Please check your inbox.
        </p>

        {error && <div className="mb-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded whitespace-pre-line">{error}</div>}

        <form onSubmit={handleOtpSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-xs">
          <button onClick={handleResend} className="text-reddit-blue hover:underline">
            Resend OTP
          </button>
          <button onClick={() => setIsOtpStep(false)} className="text-reddit-gray hover:underline">
            Back to Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-reddit-text dark:text-reddit-textDark">Sign Up</h2>

      {error && <div className="mb-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded whitespace-pre-line">{error}</div>}

      <form onSubmit={handleRegisterSubmit} className="space-y-3">
        <Input
          label="Full Name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ananya Sharma"
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="USN"
            type="text"
            required
            value={usn}
            onChange={(e) => setUsn(e.target.value)}
            placeholder="1BM23CS001"
          />
          <div>
            <label className="block text-[10px] font-bold text-auth-label dark:text-auth-labelDark uppercase mb-1">Year of Study</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-9 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue focus:bg-reddit-card dark:focus:bg-reddit-cardDark transition-colors text-reddit-text dark:text-reddit-textDark"
            >
              <option value={1} className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">1st Year</option>
              <option value={2} className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">2nd Year</option>
              <option value={3} className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">3rd Year</option>
              <option value={4} className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">4th Year</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-auth-label dark:text-auth-labelDark uppercase mb-1">Branch</label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full h-9 px-2 bg-reddit-bg dark:bg-reddit-bgDark border border-reddit-border dark:border-reddit-borderDark rounded text-xs outline-none focus:border-reddit-blue focus:bg-reddit-card dark:focus:bg-reddit-cardDark transition-colors text-reddit-text dark:text-reddit-textDark"
          >
            <option value="Computer Science (CS)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Computer Science (CS)</option>
            <option value="Information Science (IS)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Information Science (IS)</option>
            <option value="Electronics & Communication (EC)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Electronics & Communication (EC)</option>
            <option value="Mechanical Engineering (ME)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Mechanical Engineering (ME)</option>
            <option value="Electrical & Electronics (EE)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Electrical & Electronics (EE)</option>
            <option value="Civil Engineering (CV)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Civil Engineering (CV)</option>
            <option value="Biotechnology (BT)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Biotechnology (BT)</option>
            <option value="Chemical Engineering (CH)" className="bg-reddit-card dark:bg-reddit-cardDark text-reddit-text dark:text-reddit-textDark">Chemical Engineering (CH)</option>
          </select>
        </div>

        <Input
          label="Student Email (@bmsce.ac.in)"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@bmsce.ac.in"
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 pt-1"
        >
          {loading ? 'Registering...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-4 text-center text-xs">
        <span className="text-reddit-gray">Already have an account? </span>
        <Link to="/auth/login" className="text-reddit-blue font-semibold hover:underline">
          Log In
        </Link>
      </div>
    </div>
  );
};

export default Register;
