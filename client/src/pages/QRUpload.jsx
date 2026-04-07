import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { uploadToIDrive, getSignedPhotoUrls, deleteFromIDrive, buildIDriveRefUrl } from '../lib/s3';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import UpgradePlan from '../components/UpgradePlan';
import MonthlyUpgradePlan from '../components/MonthlyUpgradePlan';
import {
  ArrowLeft, QrCode, Download, Copy, Check, RefreshCw,
  Images, CalendarDays, Tag, Loader2, ExternalLink,
  Upload, X, CheckCircle, AlertCircle, ImageIcon, CloudUpload,
  Eye, EyeOff, Trash2, Square, CheckSquare, MonitorOff, HardDrive, ArrowUp
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-200 rounded-xl ${className}`}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

function EventSkeleton() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6 animate-pulse">
        {/* Back button skeleton */}
        <div className="w-32 h-4 bg-zinc-200 rounded-full mb-6" />

        {/* Header skeleton */}
        <div className="bg-white rounded-2xl p-7 mb-6 border border-zinc-100">
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

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>

        <div className="bg-white rounded-2xl p-7 border border-zinc-100">
          <div className="flex gap-6 border-b border-zinc-100 mb-8 pb-4">
            <SkeletonBlock className="w-24 h-4" />
            <SkeletonBlock className="w-24 h-4" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <SkeletonBlock key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: shimmer 1.5s infinite;
        }
      `}} />
    </DashboardLayout>
  );
}

function UploadItem({ item }) {
  const statusIcon = {
    pending:   <Loader2 size={16} className="text-zinc-400 animate-spin" />,
    uploading: <Loader2 size={16} className="text-violet-500 animate-spin" />,
    done:      <CheckCircle size={16} className="text-green-500" />,
    error:     <AlertCircle size={16} className="text-red-400" />,
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
      <div className="w-10 h-10 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
        {item.previewUrl
          ? <img src={item.previewUrl} className="w-full h-full object-cover" alt="" />
          : <ImageIcon size={18} className="text-zinc-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{item.file.name}</p>
        <p className="text-xs text-zinc-400">{formatBytes(item.file.size)}</p>
        {item.status === 'uploading' && (
          <div className="mt-1.5 h-1 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
        {item.error && <p className="text-xs text-red-500 mt-0.5">{item.error}</p>}
      </div>
      {statusIcon[item.status]}
    </div>
  );
}

function ActionOverlay({ message = "Processing..." }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-zinc-200 border border-zinc-100 p-8 flex flex-col items-center gap-4 min-w-[240px] animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-zinc-900 uppercase tracking-widest">{message}</p>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mt-1">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}

export default function QRUpload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [poolUsedBytes, setPoolUsedBytes] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showMonthlyUpgrade, setShowMonthlyUpgrade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [signedUrls, setSignedUrls] = useState({});
  const [uploading, setUploading] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState({ loading: false, message: '' });
  const fileInputRef = useRef(null);
  const qrRef = useRef(null);

  // QR view URL - this is where guests will land after scanning
  const qrViewUrl = `${window.location.origin}/qr/${id}`;

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Generate signed URLs for photos
  useEffect(() => {
    if (!photos.length) return;
    getSignedPhotoUrls(photos).then(urls => {
      if (Object.keys(urls).length) setSignedUrls(prev => ({ ...prev, ...urls }));
    });
  }, [photos]);

  const getPhotoUrl = useCallback((photo) => {
    return signedUrls[photo.id] || photo.supabase_url || null;
  }, [signedUrls]);

  /* ── Fetch event + QR gallery photos ── */
  const fetchData = useCallback(async () => {
    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    setEvent(ev);

    // Fetch ALL photos — used for storage calculation
    const { data: allPh } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: false });
    
    const allPhArr = allPh ?? [];
    setAllPhotos(allPhArr);

    // Extract photos uploaded for QR gallery (source = 'qr_gallery')
    setPhotos(allPhArr.filter(p => p.source === 'qr_gallery'));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // If event has a subscription_id, fetch subscription data + pool usage
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

        // Fetch all events in this subscription pool, then sum their photo sizes
        supabase
          .from('events')
          .select('id')
          .eq('subscription_id', sub.id)
          .then(({ data: poolEvents }) => {
            if (!poolEvents?.length) return;
            // Count ALL photos (host + guest) for pool storage
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

  /* ── Upload photos to QR gallery ── */
  const uploadFiles = useCallback(async (files) => {
    if (!user || !event) return;

    // Subscription-pool-aware storage limit check
    const isPooled = !!event.subscription_id;
    const limitGb = isPooled ? (subscription?.storage_gb ?? event.storage_gb ?? 1) : (event.storage_gb ?? 1);
    const storageUsed = isPooled ? poolUsedBytes : allPhotos.reduce((acc, p) => acc + (p.size_bytes || 0), 0);
    let pendingBytes = 0;

    const maxFileSizeMb = event.max_image_size_mb || 50;
    const maxFileSize = maxFileSizeMb * 1024 * 1024;

    const validFiles = [];
    for (const f of files) {
      if (f.size > maxFileSize) {
        showToast('error', 'File too large', `"${f.name}" exceeds the ${maxFileSizeMb} MB limit.`);
        continue;
      }
      if (!f.type.startsWith('image/')) {
        showToast('error', 'Invalid file', `"${f.name}" is not an image.`);
        continue;
      }

      const storageLimit = limitGb * 1024 * 1024 * 1024;
      if (storageUsed + pendingBytes + f.size > storageLimit) {
        showToast('error', 'Storage limit reached', `Adding "${f.name}" would exceed your ${limitGb} GB limit.`);
        if (!isPooled) setShowUpgrade(true);
        break;
      }
      pendingBytes += f.size;
      validFiles.push(f);
    }

    if (!validFiles.length) return;

    const newItems = validFiles.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      status: 'pending',
      progress: 0,
      error: null,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));

    setUploading(prev => [...newItems, ...prev]);

    for (const item of newItems) {
      setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u));

      try {
        const ext = item.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = `qr_gallery/${event.id}/${fileName}`;

        // Upload to iDrive
        await uploadToIDrive(item.file, storagePath);

        const refUrl = buildIDriveRefUrl(storagePath);

        // Record in DB with source = 'qr_gallery'
        const { error: dbErr } = await supabase.from('photos').insert({
          event_id: event.id,
          user_id: user.id,
          storage_path: storagePath,
          file_name: item.file.name,
          size_bytes: item.file.size,
          supabase_url: refUrl,
          source: 'qr_gallery',
        });

        if (dbErr) throw new Error(dbErr.message);

        setUploading(prev =>
          prev.map(u => u.id === item.id ? { ...u, status: 'done', progress: 100 } : u),
        );
      } catch (err) {
        setUploading(prev =>
          prev.map(u => u.id === item.id ? { ...u, status: 'error', error: err.message } : u),
        );
      }
    }

    await fetchData();
    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.status !== 'done'));
    }, 3000);
  }, [user, event, allPhotos, poolUsedBytes, subscription, fetchData]);

  const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); uploadFiles(Array.from(e.dataTransfer.files)); }, [uploadFiles]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleFilePick = (e) => uploadFiles(Array.from(e.target.files));

  // Subscription-pool-aware storage metrics
  const isPooled           = !!event?.subscription_id;
  const storageUsedBytes   = isPooled ? poolUsedBytes : allPhotos.reduce((acc, p) => acc + (p.size_bytes || 0), 0);
  const limitGb            = isPooled ? (subscription?.storage_gb ?? event?.storage_gb ?? 1) : (event?.storage_gb ?? 1);
  const storageLimitBytes  = limitGb * 1024 * 1024 * 1024;
  const storagePercent     = Math.min(100, (storageUsedBytes / storageLimitBytes) * 100);
  const quotaWarning       = storagePercent >= 90 && storagePercent < 100;
  const quotaFull          = storagePercent >= 100;

  const handleUpgraded = async (newStorageGb) => {
    showToast('success', 'Plan Upgraded!', `Storage upgraded to ${newStorageGb} GB.`);
    setShowUpgrade(false);
    await fetchData();
  };

  /* ── Toggle QR Live status ── */
  const updateEventSetting = async (key, value, successTitle, successMsg) => {
    if (!event) return;
    setActionLoading({ loading: true, message: 'Updating...' });
    try {
      const { error } = await supabase
        .from('events')
        .update({ [key]: value })
        .eq('id', id);

      if (error) throw error;
      showToast('success', successTitle, successMsg);
      await fetchData();
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  const handleToggleLive = () => {
    const nextValue = !event.is_qr_live;
    updateEventSetting(
      'is_qr_live',
      nextValue,
      nextValue ? 'QR Link Enabled' : 'QR Link Disabled',
      nextValue ? 'Guests can now view the QR gallery.' : 'QR gallery access has been disabled.'
    );
  };

  const handleToggleDownload = () => {
    const next = !event.allow_download;
    updateEventSetting(
      'allow_download', 
      next, 
      next ? 'Downloads Enabled' : 'Downloads Disabled', 
      next ? 'Guests can now download photos from the QR gallery.' : 'Guest downloads have been disabled.'
    );
  };

  const handleToggleScreenshot = () => {
    const next = !event.allow_screenshot;
    updateEventSetting(
      'allow_screenshot', 
      next, 
      next ? 'Protection Enabled' : 'Protection Disabled', 
      next ? 'Screenshot deterrents have been applied to guest view.' : 'Screenshot protection has been removed.'
    );
  };

  /* ── Copy QR link ── */
  const handleCopy = () => {
    navigator.clipboard.writeText(qrViewUrl);
    setCopied(true);
    showToast('success', 'Link Copied', 'QR gallery link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Download QR as PNG ── */
  const handleDownloadQR = () => {
    const svg = document.getElementById('event-qr-svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement('a');
      a.download = `${event?.name ?? 'event'}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  /* ── Selection handlers ── */
  const toggleSelect = (photoId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allSelected = photos.every(p => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  /* ── Delete selected photos ── */
  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} photos? This cannot be undone.`)) return;

    setActionLoading({ loading: true, message: `Deleting ${selectedIds.size} Photos...` });
    try {
      const selectedPhotos = photos.filter(p => selectedIds.has(p.id));

      // Delete from iDrive
      const idrivePaths = selectedPhotos
        .filter(p => !p.supabase_url?.includes('supabase.co'))
        .map(p => p.storage_path);
      if (idrivePaths.length) await deleteFromIDrive(idrivePaths);

      // Delete from DB
      const { error: dbErr } = await supabase
        .from('photos')
        .delete()
        .in('id', Array.from(selectedIds));

      if (dbErr) throw dbErr;

      setSignedUrls(prev => {
        const next = { ...prev };
        Array.from(selectedIds).forEach(id => delete next[id]);
        return next;
      });

      showToast('success', 'Deleted', `${selectedIds.size} photos removed.`);
      setSelectedIds(new Set());
      await fetchData();
    } catch (err) {
      showToast('error', 'Deletion Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  if (loading) {
    return <EventSkeleton />;
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
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-violet-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Event
        </button>

        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7 mb-6 border border-zinc-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-1">QR Gallery</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{event.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><Tag size={14} />{event.type}</span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Photo count and Storage */}
            <div className="flex gap-4 items-stretch">
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-6 py-4">
                <Images size={20} className="text-violet-500" />
                <div>
                  <p className="text-2xl font-black text-violet-700">{photos.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Photos</p>
                </div>
              </div>

              {/* Storage quota */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-2.5 min-w-[160px] shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <HardDrive size={14} className="text-violet-600" />
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
                    className={`h-full rounded-full transition-all duration-500 ${quotaFull ? 'bg-red-500' : quotaWarning ? 'bg-amber-400' : 'bg-violet-500'}`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>

              {/* Upgrade button — hidden for subscription pool events */}
              {!showUpgrade && !isPooled && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="flex flex-col items-center justify-center gap-1 px-5 rounded-xl text-xs font-bold border-2 border-violet-200 text-violet-700 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-400 hover:shadow-md transition-all active:scale-95"
                >
                  <ArrowUp size={14} className="mb-[-2px]" />
                  <span>Upgrade Plan</span>
                </button>
              )}

              {/* Upgrade button for subscription pool events */}
              {!showMonthlyUpgrade && isPooled && (
                <button
                  onClick={() => setShowMonthlyUpgrade(true)}
                  className="flex flex-col items-center justify-center gap-1 px-5 rounded-xl text-xs font-bold border-2 border-violet-200 text-violet-700 bg-violet-50/40 hover:bg-violet-50 hover:border-violet-400 hover:shadow-md transition-all active:scale-95"
                >
                  <ArrowUp size={14} className="mb-[-2px]" />
                  <span>Upgrade Plan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quota full banner */}
        {quotaFull && !showUpgrade && (
          <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6">
            <div>
              <p className="text-sm font-bold text-red-700">📛 Storage limit reached</p>
              <p className="text-xs text-red-500 mt-0.5">
                {isPooled
                  ? `Your ${limitGb} GB shared pool is full. Upgrade your monthly plan for more storage.`
                  : `You've used all ${limitGb} GB. Upgrade to continue uploading.`
                }
              </p>
            </div>
            {isPooled ? (
              <button
                onClick={() => navigate('/pricing?tab=monthly')}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white shadow hover:opacity-90 active:scale-95 transition-all"
              >
                <ArrowUp size={12} /> Upgrade Plan
              </button>
            ) : (
              <button
                onClick={() => setShowUpgrade(true)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white shadow hover:opacity-90 active:scale-95 transition-all"
              >
                <ArrowUp size={12} /> Upgrade Now
              </button>
            )}
          </div>
        )}

        {/* Quota warning banner */}
        {quotaWarning && !quotaFull && !showUpgrade && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-6">
            <div>
              <p className="text-sm font-bold text-amber-700">⚠️ Storage almost full</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {formatBytes(storageUsedBytes)} of {limitGb} GB used
                {isPooled ? ' — shared pool running low.' : ' — consider upgrading soon.'}
              </p>
            </div>
            {isPooled ? (
              <button
                onClick={() => navigate('/pricing?tab=monthly')}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 border-amber-300 text-amber-700 hover:bg-amber-100 transition-all"
              >
                <ArrowUp size={12} /> Upgrade Plan
              </button>
            ) : (
              <button
                onClick={() => setShowUpgrade(true)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 border-amber-300 text-amber-700 hover:bg-amber-100 transition-all"
              >
                <ArrowUp size={12} /> Add More
              </button>
            )}
          </div>
        )}

        {/* Upgrade Panels */}
        {showMonthlyUpgrade && isPooled && subscription && (
          <MonthlyUpgradePlan
            subscription={subscription}
            user={user}
            onUpgraded={(newGb) => {
              setShowMonthlyUpgrade(false);
              showToast('success', 'Plan Upgraded!', `Monthly pool storage upgraded to ${newGb} GB.`);
              supabase
                .from('subscriptions')
                .select('*')
                .eq('id', event.subscription_id)
                .single()
                .then(({ data }) => { if (data) setSubscription(data); });
            }}
            onClose={() => setShowMonthlyUpgrade(false)}
          />
        )}

        {showUpgrade && !isPooled && (
          <UpgradePlan
            event={event}
            user={user}
            onUpgraded={handleUpgraded}
            onClose={() => setShowUpgrade(false)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ── Live Toggle Card ── */}
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 border border-zinc-50 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${event.is_qr_live ? 'bg-green-50 text-green-600' : 'bg-zinc-100 text-zinc-400'}`}>
                    {event.is_qr_live ? <Eye size={16} /> : <EyeOff size={16} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 leading-none">QR Gallery Status</h3>
                    <p className={`text-[10px] font-bold mt-1 uppercase tracking-tighter ${event.is_qr_live ? 'text-green-600' : 'text-zinc-400'}`}>
                      {event.is_qr_live ? 'Live & Accessible' : 'Hidden & Disabled'}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={handleToggleLive}
                  className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${event.is_qr_live ? 'bg-green-500' : 'bg-zinc-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${event.is_qr_live ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>

              <p className="text-sm text-zinc-500 mb-6">
                {event.is_qr_live
                  ? 'Anyone with the QR code or link can view and download photos from this gallery.'
                  : 'The QR gallery is currently hidden. Enable it to allow guests to view photos.'}
              </p>

              {/* Status indicator */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${event.is_qr_live ? 'bg-green-50 border border-green-100' : 'bg-zinc-50 border border-zinc-100'}`}>
                <div className={`w-3 h-3 rounded-full ${event.is_qr_live ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`} />
                <div>
                  <p className={`text-sm font-bold ${event.is_qr_live ? 'text-green-700' : 'text-zinc-500'}`}>
                    {event.is_qr_live ? 'Gallery is LIVE' : 'Gallery is OFFLINE'}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {event.is_qr_live ? 'Guests can access via QR scan' : 'Toggle on to make it accessible'}
                  </p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="mt-6 pt-4 border-t border-zinc-100">
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-4">
                <strong className="text-zinc-500">Note:</strong> Guests can only VIEW and DOWNLOAD photos. They cannot upload to this gallery.
              </p>

              {/* Permissions Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${event.allow_download ? 'bg-violet-50 text-violet-600' : 'bg-zinc-100 text-zinc-400'}`}>
                      <Download size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Allow Guest Downloads</h4>
                      <p className="text-[10px] text-zinc-400">Guests can download gallery photos</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleDownload}
                    className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${event.allow_download ? 'bg-violet-500' : 'bg-zinc-200'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${event.allow_download ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${event.allow_screenshot ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-400'}`}>
                      <MonitorOff size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">Screenshot Protection</h4>
                      <p className="text-[10px] text-zinc-400">Deter guests from taking screenshots</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleToggleScreenshot}
                    className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${event.allow_screenshot ? 'bg-red-500' : 'bg-zinc-200'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${event.allow_screenshot ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── QR Code Card ── */}
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 border border-zinc-50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
                  <QrCode size={16} />
                </div>
                <h2 className="font-bold text-zinc-900">Scan to View</h2>
              </div>
            </div>

            {/* QR */}
            <div className="flex justify-center mb-6">
              <div className="p-5 bg-white rounded-2xl border-2 border-violet-100 shadow-lg shadow-violet-500/10">
                <QRCodeSVG
                  id="event-qr-svg"
                  value={qrViewUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#5b21b6"
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-400 text-center mb-6">
              Guests scan this QR to view and download photos from this gallery.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-violet-200 text-violet-700 text-sm font-bold hover:bg-violet-50 transition-all active:scale-95"
              >
                <Download size={16} /> Download QR
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all active:scale-95 shadow-lg shadow-violet-500/20"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Link preview */}
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={qrViewUrl}
                className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-500 outline-none"
              />
              <a
                href={qrViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-all"
                title="Open view page"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !quotaFull && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 mb-6 ${
            quotaFull
              ? 'border-zinc-200 bg-zinc-50 cursor-not-allowed opacity-60'
              : isDragging
              ? 'border-violet-500 bg-violet-50 scale-[1.01] cursor-pointer'
              : 'border-zinc-200 bg-white hover:border-violet-400 hover:bg-violet-50/30 cursor-pointer'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-gradient-to-br from-violet-500 to-violet-600' : 'bg-zinc-100'}`}>
              <CloudUpload size={28} className={isDragging ? 'text-white' : 'text-zinc-400'} />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-800">
                {quotaFull ? 'Quota reached — upgrade to upload more' : isDragging ? 'Drop photos here' : 'Upload photos to QR Gallery'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">or click to browse · Max 50 MB per photo</p>
            </div>
            {!quotaFull && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all"
              >
                <Upload size={14} className="inline mr-1.5" />
                Select Photos
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>

        {/* Upload Queue */}
        {uploading.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-900">Uploading Photos</h3>
              <button onClick={() => setUploading([])} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {uploading.map(item => (
                <UploadItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">QR Gallery Photos</h2>
              {photos.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-violet-600 transition-colors"
                >
                  {photos.every(p => selectedIds.has(p.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                  {photos.every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {/* Selection Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-xs font-bold text-zinc-500 mr-2">{selectedIds.size} Selected</span>
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 rounded-lg bg-zinc-50 text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                  title="Delete Selected"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {/* Refresh */}
            {photos.length > 0 && selectedIds.size === 0 && (
              <button
                onClick={fetchData}
                className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <ImageIcon size={40} className="mb-3 opacity-30" />
              <p className="font-medium">No photos in QR gallery yet</p>
              <p className="text-sm mt-1">Upload photos using the zone above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className={`group relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${selectedIds.has(photo.id) ? 'ring-4 ring-violet-500/20' : 'bg-zinc-100'}`}
                >
                  {getPhotoUrl(photo) ? (
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Loader2 size={20} className="animate-spin text-zinc-300" />
                    </div>
                  )}

                  <div
                    onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                    className={`absolute inset-0 transition-opacity duration-200 cursor-pointer ${selectedIds.has(photo.id) ? 'bg-violet-500/20 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}
                  >
                    <div className="absolute top-3 right-3">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'bg-violet-500 border-violet-500 text-white' : 'bg-white/20 border-white/40'}`}>
                        {selectedIds.has(photo.id) && <Check size={14} />}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <p className="text-white text-[10px] font-medium truncate">{photo.file_name}</p>
                    <p className="text-white/60 text-[10px]">{formatBytes(photo.size_bytes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
      {actionLoading.loading && <ActionOverlay message={actionLoading.message} />}
    </DashboardLayout>
  );
}
