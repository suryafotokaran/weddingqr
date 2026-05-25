import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import { CalendarDays, Tag, Type, Loader2, ChevronRight, Sparkles, ChevronLeft } from 'lucide-react';

const EVENT_CATEGORIES = [
  'Wedding', 'Pre-Wedding / Engagement', 'Reception', 'Birthday',
  'Corporate Event', 'Baby Shower', 'Anniversary', 'Other',
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function DatePicker({ value, onChange }) {
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear]   = useState((parsed || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed || today).getMonth());
  const [mode, setMode] = useState('day'); // 'day' | 'month' | 'year'

  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const select = (d) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
    setMode('day');
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Year range: current year - 1 to current year + 10
  const yearRange = Array.from({ length: 12 }, (_, i) => today.getFullYear() - 1 + i);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none
          ${open
            ? 'border-teal-500 ring-2 ring-teal-500/20 bg-white text-zinc-800'
            : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
          }
          ${!displayValue ? 'text-zinc-300' : ''}`}
      >
        {displayValue || 'Pick a date'}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-zinc-100 shadow-xl overflow-hidden animate-fade-in">

          {/* ── Day view ── */}
          {mode === 'day' && (
            <>
              {/* Month/Year nav */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <button type="button" onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition">
                  <ChevronLeft size={15} />
                </button>

                <button type="button" onClick={() => setMode('month')}
                  className="text-sm font-bold text-zinc-800 hover:text-teal-700 transition px-2 py-0.5 rounded-lg hover:bg-teal-50">
                  {MONTHS[viewMonth]} {viewYear}
                </button>

                <button type="button" onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition">
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 px-3 pb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-zinc-400 uppercase py-1">{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 px-3 pb-4 gap-y-0.5">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                  const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                  const isSelected = parsed && d === parsed.getDate() && viewMonth === parsed.getMonth() && viewYear === parsed.getFullYear();
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => select(d)}
                      className={`mx-auto flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
                        ${isSelected
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                          : isToday
                            ? 'bg-teal-50 text-teal-700 font-bold ring-1 ring-teal-300'
                            : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Month view ── */}
          {mode === 'month' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewYear(y => y - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition">
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={() => setMode('year')}
                  className="text-sm font-bold text-zinc-800 hover:text-teal-700 transition px-2 py-0.5 rounded-lg hover:bg-teal-50">
                  {viewYear}
                </button>
                <button type="button" onClick={() => setViewYear(y => y + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition">
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m, i) => (
                  <button key={m} type="button"
                    onClick={() => { setViewMonth(i); setMode('day'); }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all
                      ${i === viewMonth
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-zinc-600 hover:bg-zinc-100'
                      }`}>
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Year view ── */}
          {mode === 'year' && (
            <div className="p-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 text-center">Select Year</p>
              <div className="grid grid-cols-3 gap-1.5">
                {yearRange.map(y => (
                  <button key={y} type="button"
                    onClick={() => { setViewYear(y); setMode('month'); }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all
                      ${y === viewYear
                        ? 'bg-teal-600 text-white shadow-sm'
                        : y === today.getFullYear()
                          ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-300'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
    navigate(`/admin/events/${data.id}`);
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
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-visible">

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
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 z-10 pointer-events-none">
                  <CalendarDays size={15} />
                </div>
                <DatePicker value={form.date} onChange={(d) => setForm({ ...form, date: d })} />
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
                  {form.category}{form.date ? ` · ${new Date(form.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
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
