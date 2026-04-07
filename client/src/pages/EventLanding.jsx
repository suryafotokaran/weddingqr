import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  ArrowLeft, HardDrive, ArrowUp, Tag, CalendarDays,
  Images, QrCode, Clock, ChevronRight, Sparkles
} from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function SkeletonBlock({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-200 rounded-xl ${className}`}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export default function EventLanding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [poolUsedBytes, setPoolUsedBytes] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [showQRComingSoon, setShowQRComingSoon] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      setEvent(ev);

      const { data: ph } = await supabase
        .from('photos')
        .select('size_bytes')
        .eq('event_id', id);
      setPhotos(ph ?? []);

      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  useEffect(() => {
    if (!event?.subscription_id) {
      setSubscription(null);
      setPoolUsedBytes(0);
      return;
    }
    supabase
      .from('subscriptions')
      .select('*')
      .eq('id', event.subscription_id)
      .single()
      .then(({ data: sub }) => {
        if (!sub) return;
        setSubscription(sub);
        supabase
          .from('events')
          .select('id')
          .eq('subscription_id', sub.id)
          .then(({ data: poolEvents }) => {
            if (!poolEvents?.length) return;
            supabase
              .from('photos')
              .select('size_bytes')
              .in('event_id', poolEvents.map(e => e.id))
              .then(({ data: poolPhotos }) => {
                const total = (poolPhotos ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
                setPoolUsedBytes(total);
              });
          });
      });
  }, [event?.subscription_id]);

  const isPooled = !!event?.subscription_id;
  const storageUsedBytes = isPooled
    ? poolUsedBytes
    : photos.reduce((acc, p) => acc + (p.size_bytes || 0), 0);
  const limitGb = isPooled
    ? (subscription?.storage_gb ?? event?.storage_gb ?? 1)
    : (event?.storage_gb ?? 1);
  const storageLimitBytes = limitGb * 1024 * 1024 * 1024;
  const storagePercent = Math.min(100, (storageUsedBytes / storageLimitBytes) * 100);
  const quotaWarning = storagePercent >= 90 && storagePercent < 100;
  const quotaFull = storagePercent >= 100;

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

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">

        {/* Back */}
        <button
          onClick={() => navigate('/studio')}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

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

            <div className="flex gap-4 items-stretch">
              {/* Storage quota */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-2.5 min-w-[160px] shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <HardDrive size={14} className="text-teal-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    {isPooled ? 'Shared Pool' : 'Storage'}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-lg font-bold text-zinc-900">{formatBytes(storageUsedBytes)}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">/ {limitGb} GB</p>
                </div>
                {isPooled && (
                  <p className="text-[10px] text-zinc-400 leading-tight">across all events</p>
                )}
                <div className="mt-1.5 h-1 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${quotaFull ? 'bg-red-500' : quotaWarning ? 'bg-amber-400' : 'bg-teal-500'}`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>

              {/* Upgrade button */}
              <button
                onClick={() => navigate(isPooled ? '/pricing?tab=monthly' : `/events/${id}/photos`)}
                className="flex flex-col items-center justify-center gap-1 px-5 rounded-xl text-xs font-bold border-2 border-teal-200 text-teal-700 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-400 hover:shadow-md transition-all active:scale-95"
              >
                <ArrowUp size={14} className="mb-[-2px]" />
                <span>Upgrade Plan</span>
              </button>
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
            onClick={() => navigate(`/events/${id}/photos`)}
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
            onClick={() => setShowQRComingSoon(true)}
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

              {/* Coming Soon Badge */}
              <span className="absolute top-0 right-0 flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                <Sparkles size={10} /> Coming Soon
              </span>

              <h2 className="text-xl font-extrabold text-zinc-900 mb-2 tracking-tight">QR Upload</h2>
              <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                Generate a QR code — guests scan and upload their own photos directly to this event's gallery.
              </p>

              <div className="flex items-center gap-1.5 text-violet-600 font-bold text-sm group-hover:gap-2.5 transition-all duration-200">
                Learn More <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* QR Coming Soon Modal */}
      {showQRComingSoon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setShowQRComingSoon(false)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center animate-in zoom-in-95 fade-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
              <QrCode size={36} className="text-white" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles size={14} className="text-violet-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500">Coming Soon</p>
              <Sparkles size={14} className="text-violet-500" />
            </div>

            <h2 className="text-2xl font-extrabold text-zinc-900 mb-3 tracking-tight">QR Upload</h2>
            <p className="text-sm text-zinc-500 leading-relaxed mb-2">
              We're building a magical QR experience — guests will be able to scan a code and instantly upload their photos to your event gallery.
            </p>
            <p className="text-xs text-zinc-400 mb-8">Stay tuned for this exciting feature!</p>

            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock size={12} /> Guest QR scanning
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-200" />
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock size={12} /> Auto-upload to gallery
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-200" />
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock size={12} /> Real-time sync
              </div>
            </div>

            <button
              onClick={() => setShowQRComingSoon(false)}
              className="w-full py-3 rounded-2xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: shimmer 1.5s infinite; }
      `}} />
    </DashboardLayout>
  );
}
