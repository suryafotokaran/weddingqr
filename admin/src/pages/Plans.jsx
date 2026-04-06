import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Zap, Star, Crown, Save, Loader2, CheckCircle2,
  Gift, User, CalendarDays, Images, HardDrive, FileImage,
  AlertCircle, Search,
} from 'lucide-react';


const PLAN_META = {
  basic:   { icon: Zap,   iconBg: 'bg-zinc-100',  iconColor: 'text-zinc-600',  border: 'border-zinc-200'  },
  pro:     { icon: Star,  iconBg: 'bg-teal-50',   iconColor: 'text-teal-600',  border: 'border-teal-200'  },
  premium: { icon: Crown, iconBg: 'bg-orange-50', iconColor: 'text-orange-600',border: 'border-orange-200'},
};

function Field({ label, value, onChange, prefix, suffix, type = 'number', min }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm font-bold text-zinc-500">{prefix}</span>}
        <input
          type={type}
          min={min ?? 0}
          value={value}
          onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
        />
        {suffix && <span className="text-xs font-medium text-zinc-400 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

function PlanCard({ plan, onSave }) {
  const [form, setForm] = useState({ ...plan });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const meta = PLAN_META[plan.key] ?? PLAN_META.basic;
  const Icon = meta.icon;
  const changed = JSON.stringify(form) !== JSON.stringify(plan);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${meta.border} shadow-[0_8px_30px_rgba(26,28,28,0.04)] p-6 flex flex-col gap-5`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center`}>
          <Icon size={20} className={meta.iconColor} />
        </div>
        <div>
          <p className="font-bold text-zinc-900">{plan.label}</p>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{plan.key}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Price (₹)" prefix="₹" value={Math.round(form.amount_paise / 100)}
          onChange={v => set('amount_paise')(v * 100)} min={0} />
        <Field label="Storage (GB)" suffix="GB" value={form.storage_gb} onChange={set('storage_gb')} min={1} />
        <Field label="Max Image Size" suffix="MB / image" value={form.max_image_size_mb} onChange={set('max_image_size_mb')} min={1} />
        <Field label="Tagline" type="text" value={form.tagline} onChange={set('tagline')} />
      </div>

      <div className="flex items-center justify-between mt-1">
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => set('is_active')(e.target.checked)}
            className="accent-teal-600"
          />
          Active on Pricing page
        </label>
        <button
          onClick={handleSave}
          disabled={!changed || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            saved
              ? 'bg-teal-50 text-teal-700'
              : changed
              ? 'silk-gradient text-white shadow-md hover:opacity-90'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}

const EVENT_TYPES = ['Wedding', 'Engagement', 'Birthday', 'Corporate', 'Anniversary', 'Other'];

function UserPicker({ users, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const selected = users.find(u => u.id === value);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.studio_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
          open ? 'border-teal-500 bg-white' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
        }`}
      >
        {selected ? (
          <>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selected.full_name || selected.email)}&background=00685f&color=fff&size=64`}
              className="w-8 h-8 rounded-lg object-cover shrink-0"
              alt="avatar"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{selected.full_name || selected.email}</p>
              <p className="text-xs text-zinc-400 truncate">{selected.full_name ? selected.email : ''}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0">
              <User size={15} className="text-zinc-400" />
            </div>
            <span className="text-sm text-zinc-400 font-medium">Select a user…</span>
          </>
        )}
        <Search size={15} className="text-zinc-400 shrink-0 ml-auto" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-100 shadow-[0_20px_60px_rgba(26,28,28,0.12)] overflow-hidden">
          {/* Search box */}
          <div className="p-3 border-b border-zinc-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search by name, email, or studio…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-sm">No users found</div>
            ) : filtered.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange(u.id); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors ${
                  u.id === value ? 'bg-teal-50' : ''
                }`}
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=00685f&color=fff&size=64`}
                  className="w-9 h-9 rounded-xl object-cover shrink-0"
                  alt="avatar"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{u.full_name || u.email}</p>
                    {u.studio_name && (
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full shrink-0">{u.studio_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{u.full_name ? u.email : ''}</p>
                </div>
                <div className="text-xs text-zinc-400 shrink-0 text-right">
                  <p>{u.event_count} events</p>
                  <p>{u.photo_count} photos</p>
                </div>
                {u.id === value && <CheckCircle2 size={15} className="text-teal-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GrantFreeEvent({ users }) {

  const { session } = useAuth();
  const [form, setForm] = useState({
    user_id: '', event_name: '', event_type: 'Wedding',
    event_date: new Date().toISOString().split('T')[0],
    photos_limit: 99999, storage_gb: 25, max_image_size_mb: 50,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message }

  const set = (field) => (e) => setForm(f => ({
    ...f, [field]: e.target ? e.target.value : e,
  }));

  const handleGrant = async () => {
    if (!form.user_id || !form.event_name || !form.event_date) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('admin_grant_free_event', {
        p_user_id:           form.user_id,
        p_event_name:        form.event_name,
        p_event_type:        form.event_type,
        p_event_date:        form.event_date,
        p_photos_limit:      Number(form.photos_limit),
        p_storage_gb:        Number(form.storage_gb),
        p_max_image_size_mb: Number(form.max_image_size_mb),
      });
      if (error) throw error;
      setResult({ success: true, message: `Free event created successfully! Event ID: ${data}` });
      setForm(f => ({ ...f, event_name: '', user_id: '' }));
    } catch (e) {
      setResult({ success: false, message: e.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all";
  
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(26,28,28,0.04)] border border-zinc-100 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <Gift size={20} className="text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-zinc-900">Grant Free Event</h3>
          <p className="text-xs text-zinc-400">Create a free event directly for a specific user</p>
        </div>
      </div>

      {result && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          result.success ? 'bg-teal-50 border border-teal-100 text-teal-700' : 'bg-red-50 border border-red-100 text-red-600'
        }`}>
          {result.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* User picker */}
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
            Select User
          </label>
          <UserPicker
            users={users}
            value={form.user_id}
            onChange={id => setForm(f => ({ ...f, user_id: id }))}
          />
        </div>


        {/* Event Name */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Event Name</label>
          <input type="text" placeholder="e.g. Priya & Rahul Wedding"
            value={form.event_name} onChange={set('event_name')}
            className={inputCls} />
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Event Type</label>
          <select value={form.event_type} onChange={set('event_type')} className={inputCls}>
            {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Event Date */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
            <CalendarDays size={11} className="inline mr-1" />Event Date
          </label>
          <input type="date" value={form.event_date} onChange={set('event_date')} className={inputCls} />
        </div>

        {/* Photos Limit */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
            <Images size={11} className="inline mr-1" />Photos Limit
          </label>
          <input type="number" min={1} value={form.photos_limit}
            onChange={e => setForm(f => ({ ...f, photos_limit: Number(e.target.value) }))}
            className={inputCls} />
        </div>

        {/* Storage */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
            <HardDrive size={11} className="inline mr-1" />Storage (GB)
          </label>
          <input type="number" min={1} value={form.storage_gb}
            onChange={e => setForm(f => ({ ...f, storage_gb: Number(e.target.value) }))}
            className={inputCls} />
        </div>

        {/* Max image size */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
            <FileImage size={11} className="inline mr-1" />Max Image Size (MB)
          </label>
          <input type="number" min={1} value={form.max_image_size_mb}
            onChange={e => setForm(f => ({ ...f, max_image_size_mb: Number(e.target.value) }))}
            className={inputCls} />
        </div>
      </div>

      <button
        onClick={handleGrant}
        disabled={loading || !form.user_id || !form.event_name}
        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold silk-gradient text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
        {loading ? 'Creating…' : 'Grant Free Event'}
      </button>
    </div>
  );
}

export default function Plans() {
  const { session } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      setLoading(true);
      const [{ data: planData }, { data: usersData }] = await Promise.all([
        supabase.from('plan_configs').select('*').order('amount_paise'),
        supabase.rpc('admin_get_users'),
      ]);
      setConfigs(planData ?? []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLoading(false);
    })();
  }, [session?.access_token]);

  const handleSave = async (form) => {
    await supabase.rpc('admin_update_plan_config', {
      p_key:               form.key,
      p_label:             form.label,
      p_amount_paise:      form.amount_paise,
      p_photos_limit:      form.photos_limit,
      p_storage_gb:        form.storage_gb,
      p_max_image_size_mb: form.max_image_size_mb,
      p_tagline:           form.tagline,
      p_is_active:         form.is_active,
    });
    // Refresh configs
    const { data } = await supabase.from('plan_configs').select('*').order('amount_paise');
    setConfigs(data ?? []);
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <header className="mb-10">
        <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">Admin · Config</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Plans</h1>
        <p className="text-sm text-zinc-500 mt-1">Edit plan pricing & limits — changes reflect instantly on the client Pricing page</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-teal-600" size={32} />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Plan Config Cards */}
          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Plan Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {configs.map(plan => (
                <PlanCard key={plan.key} plan={plan} onSave={handleSave} />
              ))}
            </div>
          </section>

          {/* Grant Free Event */}
          <section>
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Grant Free Event</h2>
            <GrantFreeEvent users={users} />
          </section>
        </div>
      )}
    </div>
  );
}
