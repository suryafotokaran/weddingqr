import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import {
  CalendarDays, Tag, Type, Loader2, ChevronRight, PartyPopper, Images,
} from 'lucide-react';

const EVENT_CATEGORIES = [
  'Wedding', 'Pre-Wedding / Engagement', 'Reception', 'Birthday',
  'Corporate Event', 'Baby Shower', 'Anniversary', 'Other',
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [form, setForm] = useState({ name: '', category: 'Wedding', date: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id:           user.id,
        name:              form.name.trim(),
        type:              form.category,
        date:              form.date,
        max_image_size_mb: 20, // Global default
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast('error', 'Failed to create event', error.message);
      return;
    }
    navigate(`/events/${data.id}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 mb-2">
            Create Your Event
          </h1>
          <p className="text-zinc-500 font-medium">
            Name your event and set the date — then start uploading photos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(26,28,28,0.06)] overflow-hidden">
          <div className="p-8 space-y-6">

            {/* Event Name */}
            <div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Event Name</span>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Type size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Riya & Arjun Wedding"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder-zinc-300"
                  />
                </div>
              </label>
            </div>

            {/* Category */}
            <div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Category</span>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <Tag size={18} />
                  </div>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none"
                  >
                    {EVENT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
              </label>
            </div>

            {/* Date */}
            <div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-500 tracking-wide uppercase">Event Date</span>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                    <CalendarDays size={18} />
                  </div>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed bg-teal-700 text-white hover:opacity-90"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Creating…</>
                : <><CalendarDays size={16} /> Create Event &amp; Start Uploading</>
              }
            </button>
          </div>
        </form>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
