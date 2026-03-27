import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/confirm-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
      setTimeout(() => navigate('/otp', { state: { type: 'recovery', email } }), 2000);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a verification code"
    >
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-brand-outline-variant bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 mt-2 active:scale-[0.98]
              ${email.trim() && !loading
                ? 'silk-gradient text-white hover:opacity-90'
                : 'bg-brand-surface-container text-brand-outline cursor-not-allowed'}`}
          >
            {loading ? 'Sending…' : 'Send Code'}
          </button>

          <p className="text-center text-sm text-brand-on-surface-variant pt-2">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="text-brand-primary font-bold hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-bold text-brand-on-surface">Code sent!</p>
          <p className="text-sm text-brand-on-surface-variant">Check your email and enter the code on the next screen.</p>
        </div>
      )}
    </AuthLayout>
  );
}
