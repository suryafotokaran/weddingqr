import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  CalendarDays, Tag, ChevronRight, FolderOpen, Plus, HardDrive, Camera, ArrowUpRight,
} from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const GB = 1024 * 1024 * 1024;

export default function Studio() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const fullName = userData?.fullName ?? 'Photographer';

  const [events,      setEvents]      = useState([]);
  const [photoCount,  setPhotoCount]  = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const user = userData?.user;
    if (!user) return;
    (async () => {
      setLoading(true);
      const [evRes, countRes, sizeRes] = await Promise.all([
        supabase.from('events').select('id,name,type,date,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.rpc('get_user_photo_count', { p_user_id: user.id }),
        supabase.from('photos').select('size_bytes').eq('user_id', user.id),
      ]);
      setEvents(evRes.data ?? []);
      setPhotoCount(countRes.data ?? 0);
      setStorageUsed((sizeRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0));
      setLoading(false);
    })();
  }, [userData]);

  const storageLimitGb = userData?.user?.user_metadata?.storage_limit_gb ?? 10;
  const GLOBAL_STORAGE_LIMIT = storageLimitGb * GB;
  const storagePercent = Math.min(100, (storageUsed / GLOBAL_STORAGE_LIMIT) * 100);
  const firstName = fullName.split(' ')[0];

  return (
    <DashboardLayout>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-teal-600 font-semibold tracking-widest text-[10px] uppercase mb-1.5">Workspace Overview</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-medium">
            {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''} · ${photoCount.toLocaleString()} photos`}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/createevent')}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold shadow-md hover:bg-teal-800 active:scale-95 transition-all shrink-0"
        >
          <Plus size={15} />
          Create New Event
          <ArrowUpRight size={13} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </button>
      </div>

      {/* ── 4-up Stat Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Events Created',  value: loading ? '—' : events.length,               icon: CalendarDays },
          { label: 'Photos Uploaded', value: loading ? '—' : photoCount.toLocaleString(), icon: Camera },
          { label: 'Storage Used',    value: loading ? '—' : formatBytes(storageUsed),    icon: HardDrive },
          { label: 'Capacity Used',   value: loading ? '—' : `${storagePercent.toFixed(1)}%`, icon: HardDrive },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-100 px-5 py-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                <Icon size={14} className="text-teal-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tracking-tight leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Storage Bar ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <HardDrive size={16} className="text-teal-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-zinc-600">{formatBytes(storageUsed)} <span className="text-zinc-400">/ {storageLimitGb} GB</span></p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${storagePercent > 90 ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
              {storagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${storagePercent > 90 ? 'bg-red-500' : 'bg-teal-600'}`}
              style={{ width: `${Math.max(storagePercent, 0.4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Recent Events ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Events</h2>
          <button
            onClick={() => navigate('/admin/events')}
            className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 tracking-widest uppercase hover:text-teal-800 transition"
          >
            View All <ChevronRight size={11} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-zinc-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
              <FolderOpen size={24} className="text-zinc-300" />
            </div>
            <p className="font-semibold text-zinc-700 mb-1 text-sm">No events yet</p>
            <p className="text-sm text-zinc-400 mb-5 max-w-xs">Create your first event to start collecting photos.</p>
            <button
              onClick={() => navigate('/admin/createevent')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold shadow-md hover:bg-teal-800 active:scale-95 transition-all"
            >
              <Plus size={14} /> Create Event
            </button>
          </div>
        ) : (
          <div>
            {events.slice(0, 6).map((event, idx) => (
              <div
                key={event.id}
                onClick={() => navigate(`/admin/events/${event.id}`)}
                className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer group hover:bg-teal-50/50 transition-colors ${idx !== 0 ? 'border-t border-zinc-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
                  <CalendarDays size={16} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 truncate text-sm group-hover:text-teal-700 transition-colors">{event.name}</p>
                  <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1"><Tag size={10} />{event.type}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={10} />{formatDate(event.date)}</span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-zinc-200 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="py-5 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-300 font-medium">© 2025 WeddingQR · All photography rights reserved.</p>
      </footer>

    </DashboardLayout>
  );
}
