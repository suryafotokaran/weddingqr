import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { supabase } from '../../lib/supabase';

// Returns 0–4 strength score
function getStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

const STRENGTH_CONFIG = [
  { label: 'Weak',   color: 'bg-red-500',    text: 'text-red-500'    },
  { label: 'Fair',   color: 'bg-orange-400',  text: 'text-orange-400' },
  { label: 'Good',   color: 'bg-yellow-400',  text: 'text-yellow-500' },
  { label: 'Strong', color: 'bg-green-500',   text: 'text-green-600'  },
];

export default function ConfirmPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPass, setShowPass] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const toggleShow = (field) => () => setShowPass({ ...showPass, [field]: !showPass[field] });

  const mismatch = form.confirm && form.password !== form.confirm;
  const isValid = form.password.length >= 8 && form.password === form.confirm;
  const strength = getStrength(form.password);
  const strengthCfg = STRENGTH_CONFIG[Math.max(strength - 1, 0)];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password: form.password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/admin/studio');
    }
  };

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Choose a strong password for your account"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}
        {/* New Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPass.password ? 'text' : 'password'}
              required
              minLength={8}
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
              className={`w-full px-4 py-3 rounded-xl border bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 transition-all pr-12
                ${form.password.length >= 8 ? 'border-brand-primary focus:ring-brand-primary/30' : 'border-brand-outline-variant focus:ring-brand-primary/30 focus:border-brand-primary'}`}
            />
            <button type="button" onClick={toggleShow('password')} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-outline hover:text-brand-primary text-xs font-semibold transition-colors">
              {showPass.password ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Strength indicator */}
          {form.password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`flex-1 h-1.5 rounded-full transition-all duration-300
                      ${strength >= level ? strengthCfg.color : 'bg-brand-outline-variant'}`}
                  />
                ))}
              </div>
              <p className={`text-xs font-bold transition-colors duration-300 ${strengthCfg.text}`}>
                {strengthCfg.label} password
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showPass.confirm ? 'text' : 'password'}
              required
              value={form.confirm}
              onChange={set('confirm')}
              placeholder="Repeat your password"
              className={`w-full px-4 py-3 rounded-xl border bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 transition-all pr-12
                ${mismatch ? 'border-red-400 focus:ring-red-200' : 'border-brand-outline-variant focus:ring-brand-primary/30 focus:border-brand-primary'}`}
            />
            <button type="button" onClick={toggleShow('confirm')} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-outline hover:text-brand-primary text-xs font-semibold transition-colors">
              {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mismatch && (
            <p className="text-xs text-red-500 font-medium mt-1">Passwords don't match</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || loading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] mt-2
            ${isValid && !loading
              ? 'silk-gradient text-white hover:opacity-90'
              : 'bg-brand-surface-container text-brand-outline cursor-not-allowed'}`}
        >
          {loading ? 'Saving…' : 'Reset Password'}
        </button>

        {/* Back to sign in */}
        <p className="text-center text-sm text-brand-on-surface-variant pt-2">
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="text-brand-primary font-bold hover:underline"
          >
            ← Back to Sign In
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
