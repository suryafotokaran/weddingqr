import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  Images, CalendarDays, Tag, ChevronRight, FolderOpen, Plus, Clock,
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

function getDaysLeft(endDate) {
  if (!endDate) return null;
  const ms = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function Studio() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const fullName = userData?.fullName ?? 'Photographer';

  const [events,      setEvents]      = useState([]);
  const [photoCount,  setPhotoCount]  = useState(0);
  const [activePlan,  setActivePlan]  = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const user = userData?.user;
    if (!user) return;

    (async () => {
      setLoading(true);

      // Fetch active plan + photo count in parallel
      const [planRes, evRes, countRes] = await Promise.all([
        supabase.rpc('get_user_active_plan', { p_user_id: user.id }),
        supabase.from('events').select('id, name, type, date, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.rpc('get_user_photo_count', { p_user_id: user.id }),
      ]);

      setActivePlan(planRes.data?.[0] ?? null);
      setEvents(evRes.data ?? []);
      setPhotoCount(countRes.data ?? 0);
      setLoading(false);
    })();
  }, [userData]);

  const daysLeft = getDaysLeft(activePlan?.end_date);

  const daysLeftBadge = () => {
    if (daysLeft === null) return null;
    let cls = 'bg-teal-500/40 text-teal-50';
    if (daysLeft <= 5) cls = 'bg-red-500 text-white font-bold shadow-md ring-2 ring-red-400/50';
    else if (daysLeft <= 10) cls = 'bg-amber-400 text-amber-900 font-bold shadow-sm';
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${cls}`}>
        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
      </span>
    );
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="mb-10">
        <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">Workspace Overview</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
          {getGreeting()}, {fullName.split(' ')[0]}.
        </h1>
      </header>

      {/* Active Plan Banner */}
      {activePlan && (
        <section className="mb-6">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200 mb-0.5">
                {activePlan.plan_key === 'free_trial' ? 'Free Trial · Active' : 'Yearly Plan · Active'}
              </p>
              <p className="font-bold text-lg capitalize">{activePlan.plan_key.replace(/_/g, ' ')}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-teal-100">
                  {photoCount.toLocaleString()} / {activePlan.photos_limit.toLocaleString()} photos used
                </span>
                <span className="text-xs text-teal-200 flex items-center gap-2">
                  Expires {formatDate(activePlan.end_date)}
                  {daysLeftBadge()}
                </span>
              </div>
              {/* Photo quota progress */}
              <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden w-full max-w-xs">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (photoCount / activePlan.photos_limit) * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => navigate('/createevent')}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-teal-700 text-sm font-bold hover:bg-teal-50 transition-all active:scale-95"
            >
              <Plus size={15} /> Create Event
            </button>
          </div>
        </section>
      )}

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

        {/* Total Photos */}
        <div className="bg-white p-8 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300">
          <div>
            <Images size={24} className="text-amber-700 mb-4" />
            <h4 className="text-sm font-medium text-zinc-500">Total Photos Uploaded</h4>
            <p className="text-4xl font-extrabold mt-2 text-zinc-900">
              {loading ? '—' : photoCount.toLocaleString()}
            </p>
            {activePlan && (
              <p className="text-sm text-zinc-400 mt-1">
                of {activePlan.photos_limit.toLocaleString()} photo limit
              </p>
            )}
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-700 bg-orange-50 w-fit px-3 py-1.5 rounded-lg">
            <Images size={12} />
            ACROSS ALL EVENTS
          </div>
        </div>
      </section>

      {/* Recent Events */}
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
              onClick={() => navigate('/createevent')}
              className="silk-gradient text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow hover:opacity-90 active:scale-95 transition-all"
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
