import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  HardDrive,
  CalendarDays,
  Tag,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

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

export default function Studio() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const fullName  = userData?.fullName  ?? 'Photographer';

  const [events,       setEvents]       = useState([]);
  const [totalStorage, setTotalStorage] = useState(0); // bytes
  const [storageUsed,  setStorageUsed]  = useState({}); // { eventId: bytes }
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const user = userData?.user;
    if (!user) return;

    (async () => {
      setLoading(true);

      // Fetch events + linked purchase plan
      const { data: evs } = await supabase
        .from('events')
        .select('id, name, type, date, photos_limit, storage_gb, created_at, purchase_id, purchases(plan)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const eventList = evs ?? [];
      setEvents(eventList);

      // Fetch storage used per event
      if (eventList.length > 0) {
        const { data: ph } = await supabase
          .from('photos')
          .select('event_id, size_bytes')
          .in('event_id', eventList.map(e => e.id));

        const usage = {};
        for (const p of ph ?? []) {
          usage[p.event_id] = (usage[p.event_id] ?? 0) + (p.size_bytes || 0);
        }
        setStorageUsed(usage);
        setTotalStorage(Object.values(usage).reduce((a, b) => a + b, 0));
      }

      setLoading(false);
    })();
  }, [userData]);

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="mb-10">
        <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">Workspace Overview</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
          {getGreeting()}, {fullName.split(' ')[0]}.
        </h1>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Events Created */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
          <div>
            <CalendarDays size={24} className="text-teal-700 mb-4" />
            <h4 className="text-sm font-medium text-zinc-500">Events Created</h4>
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

        {/* Total Storage Used */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
          <div>
            <HardDrive size={24} className="text-amber-700 mb-4" />
            <h4 className="text-sm font-medium text-zinc-500">Total Storage Used</h4>
            <p className="text-4xl font-extrabold mt-2 text-zinc-900">
              {loading ? '—' : formatBytes(totalStorage)}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-700 bg-orange-50 w-fit px-3 py-1.5 rounded-lg">
            <HardDrive size={12} />
            ACROSS ALL EVENTS
          </div>
        </div>
      </section>

      {/* Recent Events List */}
      <section className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-8 mb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900">Recent Events</h3>
          <button
            onClick={() => navigate('/events')}
            className="text-xs font-bold text-amber-700 tracking-widest uppercase hover:underline"
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
              onClick={() => navigate('/pricing')}
              className="silk-gradient text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow hover:opacity-90 active:scale-95 transition-all"
            >
              Create Event
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 6).map(event => {
                const plan      = event.purchases?.plan ?? null;

                const planStyle = {
                  basic:   { bg: '#f3f3f4', color: '#3d4947', label: 'Starter'      },
                  pro:     { bg: '#89f5e7', color: '#00685f', label: 'Professional' },
                  premium: { bg: '#ffdbcf', color: '#85513e', label: 'Elite'        },
                }[plan] ?? { bg: '#f3f3f4', color: '#6d7a77', label: 'Plan' };

                return (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-50 cursor-pointer group transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                      <CalendarDays size={20} className="text-teal-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{event.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                        <span className="flex items-center gap-1"><Tag size={11} />{event.type}</span>
                        <span className="flex items-center gap-1"><CalendarDays size={11} />{formatDate(event.date)}</span>
                      </div>
                    </div>

                    {/* Right side tags */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Storage used badge */}
                      <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                        {formatBytes(storageUsed[event.id] ?? 0)} / {event.storage_gb} GB
                      </span>
                      {/* Plan tag */}
                      {plan && (
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: planStyle.bg, color: planStyle.color }}
                        >
                          {planStyle.label}
                        </span>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-teal-500 transition-colors shrink-0" />
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Cloud Storage — hidden for now */}
      {/* <div className="bg-teal-900 text-white p-8 rounded-2xl shadow-xl ...">...</div> */}

      {/* Footer */}
      <footer className="mt-4 py-8 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-400 font-medium">
          © 2025 WeddingQR. All photography rights reserved.
        </p>
      </footer>
    </DashboardLayout>
  );
}
