import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  CalendarDays, Images, Plus, ChevronRight, Loader2, FolderOpen, Tag,
} from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function Events() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [events,     setEvents]     = useState([]);
  const [photoCounts, setPhotoCounts] = useState({}); // { eventId: count }
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const { data } = await supabase
        .from('events')
        .select('id, name, type, date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const evList = data ?? [];
      setEvents(evList);

      // Fetch exact photo counts per event (parallel HEAD queries — no row limit issue)
      if (evList.length > 0) {
        const countResults = await Promise.all(
          evList.map(e =>
            supabase
              .from('photos')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', e.id)
          )
        );
        const counts = {};
        evList.forEach((e, i) => {
          counts[e.id] = countResults[i].count ?? 0;
        });
        setPhotoCounts(counts);
      }

      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-1">Your Events</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Events</h1>
          </div>
          <button
            onClick={() => navigate('/admin/createevent')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all hover:opacity-90 silk-gradient text-white"
          >
            <Plus size={16} /> New Event
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="animate-spin text-teal-600" size={32} />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
            <FolderOpen size={52} className="mb-4 opacity-25" />
            <p className="text-lg font-bold text-zinc-600 mb-1">No events yet</p>
            <p className="text-sm mb-6">Create your first event to start uploading photos.</p>
            <button
              onClick={() => navigate('/admin/createevent')}
              className="silk-gradient text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={14} className="inline mr-1.5" /> Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map(event => {
              const count = photoCounts[event.id] ?? 0;
              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/admin/events/${event.id}`)}
                  className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-6 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-200 group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-teal-600">
                          <Tag size={10} /> {event.type}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-zinc-900 leading-tight truncate">{event.name}</h2>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-zinc-300 group-hover:text-teal-500 transition-colors mt-1 shrink-0 ml-2"
                    />
                  </div>

                  {/* Date + photo count */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <CalendarDays size={13} />
                      {formatDate(event.date)}
                    </div>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                      <Images size={11} />
                      {count.toLocaleString()} {count === 1 ? 'photo' : 'photos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
