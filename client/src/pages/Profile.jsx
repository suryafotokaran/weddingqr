import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Building2, Mail, KeyRound, Loader2, LogOut } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

export default function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', studioName: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setForm({
        name: user.user_metadata?.full_name || '',
        studioName: user.user_metadata?.studio_name || '',
        email: user.email || '',
      });
    }
    setLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: form.name,
        studio_name: form.studioName,
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Profile updated successfully.');
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mt-8">
        <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] overflow-hidden">
          <div className="px-8 py-10 border-b border-zinc-100">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 mb-2">My Profile</h1>
            <p className="text-zinc-500 font-medium">Manage your personal settings and studio details.</p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-teal-600" size={32} />
              </div>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-4 bg-teal-50 text-teal-700 text-sm font-medium rounded-xl border border-teal-100">
                    {success}
                  </div>
                )}

                {/* Email Readonly */}
                <div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Email Address</span>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={form.email}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 text-sm font-medium opacity-70 cursor-not-allowed"
                      />
                    </div>
                  </label>
                  <p className="text-xs text-zinc-400 mt-2 font-medium">To change your email, please contact support.</p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Full Name</span>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder-zinc-300"
                      />
                    </div>
                  </label>
                </div>

                {/* Studio Name */}
                <div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Studio Name</span>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Building2 size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={form.studioName}
                        onChange={(e) => setForm({ ...form, studioName: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder-zinc-300"
                      />
                    </div>
                  </label>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="flex items-center gap-2 text-sm font-bold text-amber-700 hover:text-amber-800 hover:bg-orange-50 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <KeyRound size={16} /> Change Password
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] ${
                      saving 
                        ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                        : 'silk-gradient text-white hover:opacity-90'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
