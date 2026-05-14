import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import { CalendarDays, Tag, Type, Loader2, ChevronRight, Sparkles } from 'lucide-react';

const EVENT_CATEGORIES = [
  'Wedding', 'Pre-Wedding / Engagement', 'Reception', 'Birthday',
  'Corporate Event', 'Baby Shower', 'Anniversary', 'Other',
];

export default function CreateEvent() {
  const navigate  = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [form,    setForm]    = useState({ name: '', category: 'Wedding', date: '' });
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

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
      .insert({ user_id: user.id, name: form.name.trim(), type: form.category, date: form.date, max_image_size_mb: 20 })
      .select().single();
    setSaving(false);
    if (error) { showToast('error', 'Failed to create event', error.message); return; }
    navigate(`/events/${data.id}`);
  };

  const filled = form.name.trim() && form.date;

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-teal-600 font-semibold tracking-widest text-[10px] uppercase mb-2">New Event</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-1">Create Your Event</h1>
          <p className="text-sm text-zinc-400 font-medium">Name your event and set the date — then start uploading photos.</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">

          {/* Fields */}
          <div className="p-6 space-y-5">

            {/* Event Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 tracking-widest uppercase">Event Name</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300">
                  <Type size={15} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Riya & Arjun Wedding"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder-zinc-300"
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 tracking-widest uppercase">Category</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300">
                  <Tag size={15} />
                </div>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full pl-10 pr-9 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none"
                >
                  {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 tracking-widest uppercase">Event Date</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300">
                  <CalendarDays size={15} />
                </div>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Preview strip — shows when name is filled */}
          {form.name.trim() && (
            <div className="mx-6 mb-5 px-4 py-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-teal-800 truncate">{form.name.trim()}</p>
                <p className="text-[10px] text-teal-500 font-medium">
                  {form.category}{form.date ? ` · ${new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-50 bg-zinc-50/40 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !filled}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold shadow-md hover:bg-teal-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Creating…</>
                : <><CalendarDays size={15} /> Create Event</>
              }
            </button>
          </div>
        </form>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
