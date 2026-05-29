import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deleteFromR2 } from '../lib/s3';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  CalendarDays, Images, Plus, ChevronRight, Loader2, FolderOpen, Tag, Trash2, AlertTriangle,
  // Loader2 kept for delete modal spinner
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

  const [events,      setEvents]      = useState([]);
  const [photoCounts, setPhotoCounts] = useState({});
  const [loading,     setLoading]     = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');

  const handleDeleteAllEvents = async () => {
    if (!user) return;
    setDeleting(true);

    const BATCH = 500;

    try {
      const eventList = [...events]; // snapshot

      for (let ei = 0; ei < eventList.length; ei++) {
        const event = eventList[ei];
        const eventLabel = `Event ${ei + 1}/${eventList.length}: "${event.name}"`;

        // ── Fetch all photos for this event (paginated 500 at a time) ──
        let from = 0;
        while (true) {
          setDeleteStatus(`${eventLabel} — fetching photos (${from + 1}…)`);

          const { data: photos, error } = await supabase
            .from('photos')
            .select('id, storage_path')
            .eq('event_id', event.id)
            .range(from, from + BATCH - 1);

          if (error) { console.error('Fetch photos error:', error); break; }
          if (!photos?.length) break;

          const photoIds    = photos.map(p => p.id);
          const storagePaths = photos.map(p => p.storage_path).filter(Boolean);

          // 1. Delete from Cloudflare R2
          if (storagePaths.length > 0) {
            setDeleteStatus(`${eventLabel} — deleting ${storagePaths.length} files from Cloudflare…`);
            await deleteFromR2(storagePaths);
          }

          // 2. Delete face_embeddings from Supabase
          setDeleteStatus(`${eventLabel} — deleting face data…`);
          await supabase.from('face_embeddings').delete().in('photo_id', photoIds);

          // 3. Delete photo rows from Supabase
          setDeleteStatus(`${eventLabel} — deleting photo records from Supabase…`);
          await supabase.from('photos').delete().in('id', photoIds);

          if (photos.length < BATCH) break; // last page
          from += BATCH;
        }

        // ── Delete the event itself from Supabase ──
        setDeleteStatus(`${eventLabel} — deleting event…`);
        await supabase.from('events').delete().eq('id', event.id);

        // Remove from UI immediately as each event is deleted
        setEvents(prev => prev.filter(e => e.id !== event.id));
        setPhotoCounts(prev => { const n = { ...prev }; delete n[event.id]; return n; });
      }

      setDeleteModal(false);
      setDeleteStatus('');
    } catch (err) {
      console.error('Delete all events error:', err);
      setDeleteStatus(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="flex items-center gap-3">
            {events.length > 0 && (
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-400 active:scale-95 transition-all"
              >
                <Trash2 size={15} /> Delete All
              </button>
            )}
            <button
              onClick={() => navigate('/admin/createevent')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all hover:opacity-90 silk-gradient text-white"
            >
              <Plus size={16} /> New Event
            </button>
          </div>
        </div>

        {/* Delete All Confirmation Modal */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              {deleting ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <Loader2 size={36} className="animate-spin text-red-500" />
                  <p className="font-bold text-zinc-800">Deleting all events…</p>
                  <p className="text-sm text-zinc-500">{deleteStatus}</p>
                  <p className="text-xs text-zinc-400">Please don't close this tab. This may take a while.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                      <AlertTriangle size={22} className="text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900">Delete All Events?</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} · {Object.values(photoCounts).reduce((a, b) => a + b, 0).toLocaleString()} photos</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 mb-6">
                    This will permanently delete <strong>all events, all photos</strong> from storage, and all related data. This <strong>cannot be undone</strong>.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteModal(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-zinc-700 font-semibold text-sm hover:border-zinc-400 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAllEvents}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Delete All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-6 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="h-3 w-20 bg-zinc-100 rounded-full mb-2" />
                    <div className="h-5 w-2/3 bg-zinc-200 rounded-lg" />
                  </div>
                  <div className="h-5 w-5 bg-zinc-100 rounded-md ml-2 mt-1 shrink-0" />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="h-3 w-24 bg-zinc-100 rounded-full" />
                  <div className="h-6 w-20 bg-zinc-100 rounded-full" />
                </div>
              </div>
            ))}
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
