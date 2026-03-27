import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', studioName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.name,
          studio_name: form.studioName,
        },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Supabase sends a confirmation email → go to OTP screen
      navigate('/otp', { state: { email: form.email } });
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join WeddingQR and start sharing memories"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
            Full Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={set('name')}
            placeholder="Jane Smith"
            className="w-full px-4 py-3 rounded-xl border border-brand-outline-variant bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
          />
        </div>

        {/* Studio Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
            Studio Name
          </label>
          <input
            type="text"
            required
            value={form.studioName}
            onChange={set('studioName')}
            placeholder="e.g. Golden Hour Studio"
            className="w-full px-4 py-3 rounded-xl border border-brand-outline-variant bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-brand-outline-variant bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-on-surface-variant tracking-wide uppercase">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
              minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-brand-outline-variant bg-brand-surface-low text-brand-on-surface text-sm font-medium placeholder-brand-outline focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-outline hover:text-brand-primary transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 mt-2 active:scale-[0.98]
            ${loading
              ? 'bg-brand-surface-container text-brand-outline cursor-not-allowed'
              : 'silk-gradient text-white hover:opacity-90'}`}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-brand-outline-variant" />
          <span className="text-xs text-brand-outline font-medium">or</span>
          <div className="flex-1 h-px bg-brand-outline-variant" />
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-brand-on-surface-variant">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="text-brand-primary font-bold hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
