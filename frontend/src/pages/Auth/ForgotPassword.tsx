import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Input } from '../../components/common/Input';
import { extractErrorMessage } from '../../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation: only @bmsce.ac.in emails allowed
    const isBmsce = /^[a-zA-Z0-9._%+-]+@bmsce\.ac\.in$/.test(email.toLowerCase().trim());
    if (!isBmsce) {
      setError('Only @bmsce.ac.in emails are allowed.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.toLowerCase().trim() });
      setSuccess(res.data.message || 'If an account exists, a reset code has been sent.');
      setTimeout(() => {
        navigate(`/auth/reset-password?email=${encodeURIComponent(email.toLowerCase().trim())}`);
      }, 2000);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-reddit-text dark:text-reddit-textDark">Forgot Password</h2>
      <p className="text-xs text-reddit-gray mb-4 font-sans leading-normal">
        Enter your BMSCE email address, and we will send you a 6-digit verification code to reset your password.
      </p>

      {error && <div className="mb-3 text-xs bg-red-500/10 border border-red-500/30 text-red-500 p-2 rounded">{error}</div>}
      {success && <div className="mb-3 text-xs bg-green-500/10 border border-green-500/30 text-green-500 p-2 rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="BMSCE Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@bmsce.ac.in"
        />

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full h-10 bg-reddit-orange hover:bg-reddit-orangeHover text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Code'}
        </button>
      </form>

      <div className="mt-4 text-center text-xs">
        <Link to="/auth/login" className="text-reddit-blue font-semibold hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
