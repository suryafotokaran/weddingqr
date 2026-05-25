import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  CalendarDays, Tag, ChevronRight, FolderOpen, Plus, HardDrive,
  Camera, ArrowUpRight, X, Image, Globe, Star, BookImage, LayoutTemplate,
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

/* ── Storage Breakdown Modal ─────────────────────────────────────────── */
function StorageModal({ breakdown, total, limitGb, onClose }) {
  const limit = limitGb * GB;
  const totalPercent = Math.min(100, (total / limit) * 100);

  const categories = [
    { label: 'Event Photos',      bytes: breakdown.eventPhotos,    icon: Camera,        color: 'bg-teal-500',    light: 'bg-teal-50',   text: 'text-teal-700'   },
    { label: 'Portfolio Photos',  bytes: breakdown.portfolioPhotos, icon: BookImage,    color: 'bg-violet-500',  light: 'bg-violet-50', text: 'text-violet-700' },
    { label: 'Site Gallery',      bytes: breakdown.siteGallery,    icon: Image,         color: 'bg-blue-500',    light: 'bg-blue-50',   text: 'text-blue-700'   },
    { label: 'Site Banners',      bytes: breakdown.siteBanners,    icon: LayoutTemplate,color: 'bg-orange-500',  light: 'bg-orange-50', text: 'text-orange-700' },
    { label: 'Website Builder',   bytes: breakdown.websiteBuilder, icon: Globe,         color: 'bg-pink-500',    light: 'bg-pink-50',   text: 'text-pink-700'   },
    { label: 'Review Photos',     bytes: breakdown.reviews,        icon: Star,          color: 'bg-amber-500',   light: 'bg-amber-50',  text: 'text-amber-700'  },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <HardDrive size={16} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">Storage Breakdown</p>
              <p className="text-xs text-zinc-400">{formatBytes(total)} of {limitGb} GB used</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
          >
            <X size={14} className="text-zinc-500" />
          </button>
        </div>

        {/* Overall bar */}
        <div className="mb-5">
          <div className="flex overflow-hidden h-3 rounded-full bg-zinc-100 gap-0.5">
            {categories.filter(c => c.bytes > 0).map(c => (
              <div
                key={c.label}
                className={`h-full ${c.color} transition-all duration-700`}
                style={{ width: `${Math.max((c.bytes / limit) * 100, 0.5)}%` }}
                title={`${c.label}: ${formatBytes(c.bytes)}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-zinc-400">0 GB</p>
            <p className="text-[10px] font-semibold text-zinc-500">{totalPercent.toFixed(1)}% used</p>
            <p className="text-[10px] text-zinc-400">{limitGb} GB</p>
          </div>
        </div>

        {/* Per-category rows */}
        <div className="space-y-3">
          {categories.map(({ label, bytes, icon: Icon, color, light, text }) => {
            const pct = total > 0 ? (bytes / total) * 100 : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md ${light} flex items-center justify-center`}>
                      <Icon size={12} className={text} />
                    </div>
                    <span className="text-xs font-medium text-zinc-700">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{pct.toFixed(1)}%</span>
                    <span className="text-xs font-bold text-zinc-900 w-16 text-right">{formatBytes(bytes)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.max(pct, bytes > 0 ? 0.5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-xs text-zinc-400">Free tier: {limitGb} GB total</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${totalPercent > 90 ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
            {formatBytes(limit - total)} free
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function Studio() {
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const fullName = userData?.fullName ?? 'Photographer';

  const [events,          setEvents]          = useState([]);
  const [photoCount,      setPhotoCount]      = useState(0);
  const [storageUsed,     setStorageUsed]     = useState(0);
  const [breakdown,       setBreakdown]       = useState({
    eventPhotos: 0, siteBanners: 0, portfolioPhotos: 0,
    siteGallery: 0, websiteBuilder: 0, reviews: 0,
  });
  const [eventStorages,   setEventStorages]   = useState({});
  const [loading,         setLoading]         = useState(true);
  const [showStorage,     setShowStorage]     = useState(false);

  useEffect(() => {
    const user = userData?.user;
    if (!user) return;
    (async () => {
      setLoading(true);
      const [evRes, countRes, sizeRes, bannersRes, portfolioPhotosRes, portfoliosRes, galleryRes, testimonialsRes] = await Promise.all([
        supabase.from('events').select('id,name,type,date,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.rpc('get_user_photo_count', { p_user_id: user.id }),
        supabase.from('photos').select('size_bytes').eq('user_id', user.id),
        supabase.from('site_banners').select('size_bytes'),
        supabase.from('site_portfolio_photos').select('size_bytes'),
        supabase.from('site_portfolios').select('cover_size_bytes'),
        supabase.from('site_gallery_photos').select('size_bytes'),
        supabase.from('site_testimonials').select('photos_size_bytes'),
      ]);

      setEvents(evRes.data ?? []);
      setPhotoCount(countRes.data ?? 0);

      const eventPhotos     = (sizeRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
      const siteBanners     = (bannersRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
      const portfolioPhotos = (portfolioPhotosRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0)
                            + (portfoliosRes.data ?? []).reduce((acc, p) => acc + (p.cover_size_bytes || 0), 0);
      const siteGallery     = (galleryRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
      const reviews         = (testimonialsRes.data ?? []).reduce((acc, p) => acc + (p.photos_size_bytes || 0), 0);

      const eventIds = (evRes.data ?? []).map(e => e.id);
      let websiteBuilder = 0;
      if (eventIds.length > 0) {
        const { data: wbConfigs } = await supabase
          .from('website_configs')
          .select('gallery_size_bytes')
          .in('event_id', eventIds);
        websiteBuilder = (wbConfigs ?? []).reduce((acc, c) => acc + (c.gallery_size_bytes || 0), 0);

        // Per-event storage for Recent Events display
        const perEventResults = await Promise.all(
          (evRes.data ?? []).map(e =>
            supabase.from('photos').select('size_bytes').eq('event_id', e.id)
          )
        );
        const storages = {};
        (evRes.data ?? []).forEach((e, i) => {
          storages[e.id] = (perEventResults[i].data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
        });
        setEventStorages(storages);
      }

      const total = eventPhotos + siteBanners + portfolioPhotos + siteGallery + reviews + websiteBuilder;
      setStorageUsed(total);
      setBreakdown({ eventPhotos, siteBanners, portfolioPhotos, siteGallery, websiteBuilder, reviews });
      setLoading(false);
    })();
  }, [userData]);

  const storageLimitGb    = userData?.user?.user_metadata?.storage_limit_gb ?? 10;
  const GLOBAL_STORAGE_LIMIT = storageLimitGb * GB;
  const storagePercent    = Math.min(100, (storageUsed / GLOBAL_STORAGE_LIMIT) * 100);
  const firstName         = fullName.split(' ')[0];

  return (
    <DashboardLayout>

      {showStorage && (
        <StorageModal
          breakdown={breakdown}
          total={storageUsed}
          limitGb={storageLimitGb}
          onClose={() => setShowStorage(false)}
        />
      )}

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
          { label: 'Events Created',  value: loading ? '—' : events.length,                    icon: CalendarDays, onClick: null },
          { label: 'Photos Uploaded', value: loading ? '—' : photoCount.toLocaleString(),      icon: Camera,       onClick: null },
          { label: 'Storage Used',    value: loading ? '—' : formatBytes(storageUsed),         icon: HardDrive,    onClick: () => setShowStorage(true) },
          { label: 'Capacity Used',   value: loading ? '—' : `${storagePercent.toFixed(1)}%`,  icon: HardDrive,    onClick: null },
        ].map(({ label, value, icon: Icon, onClick }) => (
          <div
            key={label}
            onClick={onClick ?? undefined}
            className={`bg-white rounded-2xl border border-zinc-100 px-5 py-4 flex flex-col gap-3 shadow-sm transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md hover:border-teal-200' : 'hover:shadow-md'}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${onClick ? 'bg-teal-100' : 'bg-teal-50'}`}>
                <Icon size={14} className="text-teal-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-zinc-900 tracking-tight leading-none">{value}</p>
            {onClick && (
              <p className="text-[10px] text-teal-600 font-semibold">Tap to see breakdown →</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Storage Bar ── */}
      <div
        onClick={() => setShowStorage(true)}
        className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-4 cursor-pointer hover:border-teal-200 hover:shadow-md transition-all"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
          <HardDrive size={16} className="text-teal-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-zinc-600">
              {formatBytes(storageUsed)} <span className="text-zinc-400">/ {storageLimitGb} GB</span>
            </p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${storagePercent > 90 ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
              {storagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden flex gap-0.5">
            {!loading && [
              { bytes: breakdown.eventPhotos,    color: 'bg-teal-500'   },
              { bytes: breakdown.portfolioPhotos, color: 'bg-violet-500' },
              { bytes: breakdown.siteGallery,    color: 'bg-blue-500'   },
              { bytes: breakdown.siteBanners,    color: 'bg-orange-500' },
              { bytes: breakdown.websiteBuilder, color: 'bg-pink-500'   },
              { bytes: breakdown.reviews,        color: 'bg-amber-500'  },
            ].filter(s => s.bytes > 0).map((s, i) => (
              <div
                key={i}
                className={`h-full ${s.color} rounded-full`}
                style={{ width: `${Math.max((s.bytes / GLOBAL_STORAGE_LIMIT) * 100, 0.3)}%` }}
              />
            ))}
            {loading && (
              <div className="h-full bg-teal-600 rounded-full transition-all duration-700" style={{ width: `${Math.max(storagePercent, 0.4)}%` }} />
            )}
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
                {!loading && eventStorages[event.id] != null && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-zinc-50 border border-zinc-100 px-2 py-0.5 rounded-full shrink-0 mr-1">
                    <HardDrive size={9} className="text-teal-500" />
                    {formatBytes(eventStorages[event.id])}
                  </span>
                )}
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
