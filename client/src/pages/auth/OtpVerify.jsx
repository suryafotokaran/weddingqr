import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { supabase } from '../../lib/supabase';

const OTP_LENGTH = 6;

export default function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRecovery = location.state?.type === 'recovery';
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [email, setEmail] = useState(location.state?.email || '');
  const emailKnown = !!location.state?.email;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef([]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/, '').slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const updated = [...otp];
        updated[index] = '';
        setOtp(updated);
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const updated = [...otp];
    pasted.split('').forEach((char, i) => { updated[i] = char; });
    setOtp(updated);
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.join('').length !== OTP_LENGTH) return;

    setLoading(true);
    setError('');

    const token = otp.join('');

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: isRecovery ? 'recovery' : 'email',
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate(isRecovery ? '/confirm-password' : '/admin/studio');
    }
  };

  const isComplete = otp.join('').length === OTP_LENGTH;

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your email address"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Email field — only shown if not passed via state */}
        {!emailKnown && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
              Your Email
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
        )}

        {/* OTP Boxes */}
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`
                w-12 h-14 text-center text-xl font-extrabold rounded-xl border-2 bg-brand-surface-low
                text-brand-on-surface focus:outline-none transition-all duration-200
                ${digit
                  ? 'border-brand-primary bg-brand-primary/5 text-brand-primary'
                  : 'border-brand-outline-variant focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'}
              `}
            />
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {otp.map((digit, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${digit ? 'bg-brand-primary' : 'bg-brand-outline-variant'}`}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={!isComplete || !email.trim() || loading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98]
            ${isComplete && email.trim() && !loading
              ? 'silk-gradient text-white hover:opacity-90'
              : 'bg-brand-surface-container text-brand-outline cursor-not-allowed'}
          `}
        >
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>

        <p className="text-center text-sm text-brand-on-surface-variant">
          Didn't receive a code?{' '}
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-brand-primary font-bold hover:underline"
          >
            Resend
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
