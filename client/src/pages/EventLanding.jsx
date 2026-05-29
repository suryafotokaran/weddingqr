import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  Tag, CalendarDays, Images, QrCode, ChevronRight, Trash2, Globe, Copy, Check, Loader2, ArrowLeft
} from 'lucide-react';
import { deleteFromR2 } from '../lib/s3';
import ConfirmModal from '../components/ConfirmModal';

function SkeletonBlock({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-200 rounded-xl ${className}`}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function EventLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const userId = userData?.user?.id;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoCount,    setPhotoCount]    = useState(0);
  const [storagePaths,  setStoragePaths]  = useState([]);
  const [eventStorage,  setEventStorage]  = useState(0); // this event only
  const [storageUsed,   setStorageUsed]   = useState(0); // global (all events)
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null });
  const [websiteConfig, setWebsiteConfig] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const GLOBAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB

  const triggerConfirm = (title, message, action) => setConfirmModal({ isOpen: true, title, message, action });
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      setEvent(ev);

      const [{ data: ph }, { data: eventCount }, { data: evStorage }] = await Promise.all([
        supabase.from('photos').select('storage_path').eq('event_id', id).limit(10000),
        supabase.rpc('get_event_photo_count', { p_event_id: id }),
        supabase.rpc('get_event_photo_storage', { p_event_id: id }),
      ]);
      setPhotoCount(eventCount ?? 0);
      setStoragePaths((ph ?? []).map(p => p.storage_path).filter(Boolean));
      setEventStorage(evStorage ?? 0);

      // Global storage for user (all sources)
      if (userId) {
        const [sizeRes, bannersRes, portfolioPhotosRes, portfoliosRes, galleryRes, testimonialsRes] = await Promise.all([
          supabase.rpc('get_user_photo_storage', { p_user_id: userId }),
          supabase.from('site_banners').select('size_bytes').limit(10000),
          supabase.from('site_portfolio_photos').select('size_bytes').limit(10000),
          supabase.from('site_portfolios').select('cover_size_bytes').limit(10000),
          supabase.from('site_gallery_photos').select('size_bytes').limit(10000),
          supabase.from('site_testimonials').select('photos_size_bytes').limit(10000),
        ]);
        const { data: allUserEvents } = await supabase.from('events').select('id').eq('user_id', userId);
        const userEventIds = (allUserEvents ?? []).map(e => e.id);
        let websiteBuilder = 0;
        if (userEventIds.length > 0) {
          const { data: wbConfigs } = await supabase.from('website_configs').select('gallery_size_bytes').in('event_id', userEventIds);
          websiteBuilder = (wbConfigs ?? []).reduce((acc, c) => acc + (c.gallery_size_bytes || 0), 0);
        }
        const total =
          (sizeRes.data ?? 0) +
          (bannersRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0) +
          (portfolioPhotosRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0) +
          (portfoliosRes.data ?? []).reduce((acc, p) => acc + (p.cover_size_bytes || 0), 0) +
          (galleryRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0) +
          (testimonialsRes.data ?? []).reduce((acc, p) => acc + (p.photos_size_bytes || 0), 0) +
          websiteBuilder;
        setStorageUsed(total);
      }

      setLoading(false);

      // Fetch website config
      const { data: wc } = await supabase
        .from('website_configs')
        .select('is_published, template_id')
        .eq('event_id', id)
        .maybeSingle();
      setWebsiteConfig(wc);
    };
    fetchData();
  }, [id, userId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto py-6 animate-pulse">
          <div className="w-32 h-4 bg-zinc-200 rounded-full mb-6" />
          <div className="bg-white rounded-2xl p-7 mb-10 border border-zinc-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="w-24 h-3" />
                <SkeletonBlock className="w-64 h-8" />
                <div className="flex gap-4">
                  <SkeletonBlock className="w-32 h-4" />
                  <SkeletonBlock className="w-32 h-4" />
                </div>
              </div>
              <SkeletonBlock className="w-40 h-16 md:w-48" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-64" />
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          .skeleton-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: shimmer 1.5s infinite; }
        `}} />
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-zinc-500">Event not found.</div>
      </DashboardLayout>
    );
  }

  const handleDeleteEvent = () => {
    triggerConfirm(
      'Delete Entire Event',
      'Are you sure you want to completely delete this event? This will permanently delete all photos, QR codes, and settings. This cannot be undone.',
      async () => {
        closeConfirm();
        setIsDeleting(true);
        try {
          // Fetch ALL photo paths via RPC — bypasses Supabase max-rows limit
          const { data: photoPathsData } = await supabase
            .rpc('get_event_photo_paths', { p_event_id: id });
          const photoPaths = photoPathsData ?? [];

          // Collect website builder gallery paths from website_configs
          const { data: wc } = await supabase.from('website_configs').select('data').eq('event_id', id).maybeSingle();
          const websiteGalleryPaths = (wc?.data?.gallery?.items || [])
            .map(item => item.storage_path)
            .filter(Boolean);

          const allPaths = [...photoPaths, ...websiteGalleryPaths];
          if (allPaths.length > 0) await deleteFromR2(allPaths);

          // Delete all Supabase rows for this event
          await supabase.from('photos').delete().eq('event_id', id);
          await supabase.from('website_configs').delete().eq('event_id', id);
          const { error } = await supabase.from('events').delete().eq('id', id);
          if (error) throw error;
          navigate('/admin/studio');
        } catch (err) {
          console.error(err);
          alert('Failed to delete event: ' + err.message);
          setIsDeleting(false);
        }
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">

        {/* Back button */}
        <button
          onClick={() => navigate('/admin/studio')}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-teal-700 transition-colors mb-3 group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-6 w-full overflow-hidden">
          <button onClick={() => navigate('/admin/studio')} className="hover:text-teal-700 hover:underline transition-colors shrink-0">Dashboard</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <button onClick={() => navigate('/admin/events')} className="hover:text-teal-700 hover:underline transition-colors shrink-0">Events</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <span className="text-zinc-900 font-bold truncate">{event.name}</span>
        </div>

        {/* Event Header — same as EventDetail */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7 mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Event</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><Tag size={14} />{event.type}</span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex gap-3 items-stretch">
              {/* Event storage pill */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 shadow-sm flex flex-col justify-center min-w-[160px]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">This Event</p>
                <p className="text-2xl font-bold text-zinc-900 leading-none">{formatBytes(eventStorage)}</p>
                <p className="text-[11px] text-zinc-400 mt-1">{photoCount} photo{photoCount !== 1 ? 's' : ''}</p>
              </div>

              {/* Global quota pill */}
              {(() => {
                const percent = Math.min(100, (storageUsed / GLOBAL_STORAGE_LIMIT) * 100);
                const isFull  = storageUsed >= GLOBAL_STORAGE_LIMIT;
                const isWarn  = percent >= 90 && !isFull;
                return (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 shadow-sm flex flex-col justify-center min-w-[170px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Images size={12} className={isFull ? 'text-red-500' : isWarn ? 'text-amber-500' : 'text-teal-600'} />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Global Storage</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className={`text-2xl font-bold leading-none ${isFull ? 'text-red-600' : 'text-zinc-900'}`}>{formatBytes(storageUsed)}</p>
                      <p className="text-[11px] text-zinc-400">/ 10 GB</p>
                    </div>
                    <div className="mt-2 h-1 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-teal-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Choose what you'd like to do</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Photo Selection Card */}
          <button
            onClick={() => navigate(`/admin/events/${id}/photos`)}
            onMouseEnter={() => setHoveredCard('photos')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative text-left bg-white rounded-2xl border-2 border-zinc-100 shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-8 hover:border-teal-300 hover:shadow-[0_20px_60px_rgba(20,184,166,0.12)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            {/* Decorative BG gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-teal-50/60 via-transparent to-transparent" />

            <div className="relative">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform duration-300">
                <Images size={26} className="text-white" />
              </div>

              {event.is_public && (
                <span className="absolute top-0 right-0 flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live
                </span>
              )}

              <h2 className="text-xl font-extrabold text-zinc-900 mb-2 tracking-tight">Photo Selection</h2>
              <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                Upload, manage, and organize all photos for this event. Allow guests to view and select their favorites.
              </p>

              <div className="flex items-center gap-1.5 text-teal-600 font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
                Open Gallery <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>
          </button>

          {/* QR Upload Card */}
          <button
            onClick={() => navigate(`/admin/events/${id}/qr-upload`)}
            onMouseEnter={() => setHoveredCard('qr')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative text-left bg-white rounded-2xl border-2 border-zinc-100 shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-8 hover:border-violet-300 hover:shadow-[0_20px_60px_rgba(139,92,246,0.12)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            {/* Decorative BG gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-violet-50/60 via-transparent to-transparent" />

            <div className="relative">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform duration-300">
                <QrCode size={26} className="text-white" />
              </div>

              {/* Live Badge */}
              {event.is_qr_live && (
                <span className="absolute top-0 right-0 flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live
                </span>
              )}

              <h2 className="text-xl font-extrabold text-zinc-900 mb-2 tracking-tight">QR Upload</h2>
              <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                Generate a QR code — guests scan and upload their own photos directly to this event's gallery.
              </p>

              <div className="flex items-center gap-1.5 text-violet-600 font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
                Open QR Upload <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>
          </button>
        </div>

        {/* Website Builder Card — commented out
        <div className="mt-6">
          <button
            onClick={() => navigate(`/admin/events/${id}/website`)}
            onMouseEnter={() => setHoveredCard('website')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative w-full text-left bg-white rounded-2xl border-2 border-zinc-100 shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-8 hover:border-rose-300 hover:shadow-[0_20px_60px_rgba(194,130,110,0.14)] transition-all duration-300 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-rose-50/60 via-transparent to-transparent" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/25 group-hover:scale-105 transition-transform duration-300 shrink-0">
                  <Globe size={26} className="text-white" />
                </div>
                <div>
                  {websiteConfig?.is_published && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Published
                    </span>
                  )}
                  {websiteConfig && !websiteConfig.is_published && (
                    <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">Draft</span>
                  )}
                  <h2 className="text-xl font-extrabold text-zinc-900 mb-1 tracking-tight">Website Builder</h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Create a beautiful wedding website. Pick a template, fill in your details, and share the link with family &amp; friends.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 md:ml-auto shrink-0 items-center">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${window.location.origin}/w/${id}`).then(() => {
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    });
                  }}
                  title="Copy shareable link"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-all"
                >
                  {copiedLink ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Share Link</>}
                </button>
                <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm group-hover:gap-2.5 transition-all duration-200 px-2">
                  Open Builder <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
                </div>
              </div>
            </div>
          </button>
        </div>
        */}

        {/* Danger Zone */}
        <div className="mt-12 bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-red-800 tracking-tight">Delete Event</h3>
            <p className="text-sm text-red-600 mt-1 max-w-xl">Permanently remove this event and all associated photos from cloud storage. This action cannot be reversed.</p>
          </div>
          <button
            onClick={handleDeleteEvent}
            disabled={isDeleting}
            className="shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-sm hover:bg-red-700 hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : <><Trash2 size={16} /> Delete Event</>}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: shimmer 1.5s infinite; }
      `}} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action || (() => {})}
        onCancel={closeConfirm}
        confirmText="Delete"
      />

      {/* Full-screen blocking overlay during delete */}
      {isDeleting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[220px]">
            <Loader2 size={36} className="animate-spin text-red-500" />
            <p className="text-base font-bold text-zinc-800">Deleting Event…</p>
            <p className="text-xs text-zinc-400 text-center">Please wait, this may take a moment.</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
