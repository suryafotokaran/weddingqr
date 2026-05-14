import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  Images, CalendarDays, Tag, ChevronRight, FolderOpen, Plus, Clock, HardDrive,
} from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const GLOBAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB

export default function Studio() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const fullName = userData?.fullName ?? 'Photographer';

  const [events,        setEvents]        = useState([]);
  const [photoCount,    setPhotoCount]    = useState(0);
  const [storageUsed,   setStorageUsed]   = useState(0);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const user = userData?.user;
    if (!user) return;

    (async () => {
      setLoading(true);

      const [evRes, countRes, sizeRes] = await Promise.all([
        supabase.from('events').select('id, name, type, date, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.rpc('get_user_photo_count', { p_user_id: user.id }),
        supabase.from('photos').select('size_bytes').eq('user_id', user.id),
      ]);

      setEvents(evRes.data ?? []);
      setPhotoCount(countRes.data ?? 0);
      
      const totalSize = (sizeRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
      setStorageUsed(totalSize);
      
      setLoading(false);
    })();
  }, [userData]);

  const storagePercent = Math.min(100, (storageUsed / GLOBAL_STORAGE_LIMIT) * 100);

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="mb-10">
        <p className="text-teal-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">Workspace Overview</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
          {getGreeting()}, {fullName.split(' ')[0]}.
        </h1>
      </header>

      {/* Storage Banner */}
      <section className="mb-6">
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
            <HardDrive size={24} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Total Storage Used</p>
                <p className="font-bold text-lg text-zinc-900">{formatBytes(storageUsed)} <span className="text-zinc-400 font-medium text-sm">/ 10 GB</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Photos</p>
                <p className="font-bold text-teal-700">{photoCount.toLocaleString()}</p>
              </div>
            </div>
            {/* Storage progress */}
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden w-full">
              <div
                className={`h-full transition-all duration-500 rounded-full ${storagePercent > 90 ? 'bg-red-500' : 'bg-teal-600'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => navigate('/createevent')}
            className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition-all active:scale-95 shadow-md"
          >
            <Plus size={16} /> Create New Event
          </button>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Events Created */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 border border-zinc-50">
          <div>
            <CalendarDays size={24} className="text-teal-700 mb-4" />
            <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Events Created</h4>
            <p className="text-4xl font-extrabold mt-2 text-zinc-900">
              {loading ? '—' : events.length}
            </p>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="mt-6 flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 w-fit px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
          >
            View all events <ChevronRight size={12} />
          </button>
        </div>

        {/* Global Storage */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 border border-zinc-50">
          <div>
            <HardDrive size={24} className="text-teal-700 mb-4" />
            <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Cloud Storage Usage</h4>
            <p className="text-4xl font-extrabold mt-2 text-zinc-900">
              {loading ? '—' : formatBytes(storageUsed)}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              of 10 GB global limit
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 w-fit px-3 py-1.5 rounded-lg">
            <HardDrive size={12} />
            ACROSS ALL EVENTS
          </div>
        </div>
      </section>

      {/* Recent Events */}
      <section className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-8 mb-10 border border-zinc-50">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900">Recent Events</h3>
          <button
            onClick={() => navigate('/events')}
            className="text-xs font-bold text-teal-700 tracking-widest uppercase hover:underline"
          >
            View All
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <FolderOpen size={40} className="mb-3 opacity-25" />
            <p className="font-semibold text-zinc-500 mb-1">No events yet</p>
            <p className="text-sm mb-5">Create your first event to get started.</p>
            <button
              onClick={() => navigate('/createevent')}
              className="bg-teal-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-teal-800 active:scale-95 transition-all"
            >
              Create Event
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 6).map(event => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50 cursor-pointer group transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <CalendarDays size={20} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 truncate">{event.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Tag size={11} />{event.type}</span>
                    <span className="flex items-center gap-1"><CalendarDays size={11} />{formatDate(event.date)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-teal-500 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-4 py-8 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-400 font-medium">
          © 2025 WeddingQR. All photography rights reserved.
        </p>
      </footer>
    </DashboardLayout>
  );
}
