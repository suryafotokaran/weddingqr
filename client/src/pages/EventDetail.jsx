import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import UpgradePlan from '../components/UpgradePlan';
import {
  Upload, X, CheckCircle, AlertCircle, Loader2, ImageIcon,
  CalendarDays, Tag, Images, ArrowLeft, CloudUpload, ArrowUp,
  Lock, Share2, Copy, Check, Trash2, Download, Square, CheckSquare,
  Eye, EyeOff, Heart, MonitorOff
} from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes) {
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

function ActionOverlay({ message = "Processing..." }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-zinc-200 border border-zinc-100 p-8 flex flex-col items-center gap-4 min-w-[240px] animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-3xl silk-gradient flex items-center justify-center shadow-lg shadow-teal-500/20">
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
    uploading: <Loader2 size={16} className="text-teal-500 animate-spin" />,
    done:      <CheckCircle size={16} className="text-teal-600" />,
    error:     <AlertCircle size={16} className="text-red-500" />,
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
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
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

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [event, setEvent]           = useState(null);
  const [photos, setPhotos]         = useState([]);
  const [uploading, setUploading]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast]           = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState({ loading: false, message: '' });
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'selected'
  const fileInputRef                = useRef(null);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchEvent = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    setEvent(ev);

    const { data: ph } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: false });
    setPhotos(ph ?? []);
    if (isInitial) setLoading(false);
  }, [id]);

  useEffect(() => { 
    if (event) setTempPassword(event.password || '');
  }, [event]);

  useEffect(() => { fetchEvent(true); }, [fetchEvent]);

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const uploadFiles = useCallback(async (files) => {
    if (!user || !event) return;

    const validFiles = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        showToast('error', 'File too large', `"${f.name}" exceeds the 50 MB limit.`);
        continue;
      }
      if (!f.type.startsWith('image/')) {
        showToast('error', 'Invalid file', `"${f.name}" is not an image.`);
        continue;
      }
      const totalPhotos = photos.length + validFiles.length;
      if (totalPhotos >= event.photos_limit) {
        showToast('error', 'Quota reached', `This event allows max ${event.photos_limit} photos. Upgrade to add more.`);
        setShowUpgrade(true);
        break;
      }
      validFiles.push(f);
    }

    if (!validFiles.length) return;

    const newItems = validFiles.map(f => ({
      id:         Math.random().toString(36).slice(2),
      file:       f,
      status:     'pending',
      progress:   0,
      error:      null,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));

    setUploading(prev => [...newItems, ...prev]);

    for (const item of newItems) {
      setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u));

      try {
        const ext         = item.file.name.split('.').pop();
        const fileName    = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = `${user.id}/${event.id}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from('photos')
          .upload(storagePath, item.file, { contentType: item.file.type, upsert: false });

        if (uploadErr) throw new Error(uploadErr.message);

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(storagePath);

        const publicUrl = urlData?.publicUrl;

        // Record metadata in Supabase DB
        const { error: dbErr } = await supabase.from('photos').insert({
          event_id:     event.id,
          user_id:      user.id,
          storage_path: storagePath,
          file_name:    item.file.name,
          size_bytes:   item.file.size,
          supabase_url: publicUrl,
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

    await fetchEvent();
    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.status !== 'done'));
    }, 3000);
  }, [user, event, photos.length, fetchEvent]);

  const handleDrop      = useCallback((e) => { e.preventDefault(); setIsDragging(false); uploadFiles(Array.from(e.dataTransfer.files)); }, [uploadFiles]);
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()  => setIsDragging(false);
  const handleFilePick  = (e) => uploadFiles(Array.from(e.target.files));

  const photoPercent    = event ? Math.min(100, (photos.length / event.photos_limit) * 100) : 0;
  const quotaWarning    = photoPercent >= 90 && photoPercent < 100;
  const quotaFull       = photoPercent >= 100;

  const handleUpgraded = async (newLimit) => {
    showToast('success', 'Plan Upgraded!', `Event upgraded to ${newLimit} photo capacity.`);
    setShowUpgrade(false);
    await fetchEvent();
  };

  const handleSavePassword = async () => {
    if (!event) return;
    setActionLoading({ loading: true, message: 'Saving Password...' });
    try {
      const { error } = await supabase
        .from('events')
        .update({ password: tempPassword })
        .eq('id', id);

      if (error) throw error;
      showToast('success', 'Privacy Updated', tempPassword ? 'Password set successfully.' : 'Password removed.');
      await fetchEvent();
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/v/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('success', 'Link Copied', 'Guest link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSelect = (photoId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const visiblePhotos = photos.filter(photo => activeTab === 'all' || (photo.likes_count || 0) > 0);
    const allVisibleSelected = visiblePhotos.every(p => selectedIds.has(p.id));

    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visiblePhotos.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visiblePhotos.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} photos? This cannot be undone.`)) return;
    
    setActionLoading({ loading: true, message: `Deleting ${selectedIds.size} Photos...` });
    try {
      const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
      const storagePaths = selectedPhotos.map(p => p.storage_path);

      // 1. Delete from Supabase Storage
      const { error: storageErr } = await supabase.storage
        .from('photos')
        .remove(storagePaths);

      if (storageErr) throw storageErr;

      // 2. Delete from Database
      const { error: dbErr } = await supabase
        .from('photos')
        .delete()
        .in('id', Array.from(selectedIds));

      if (dbErr) throw dbErr;

      showToast('success', 'Deleted', `${selectedIds.size} photos removed successfully.`);
      setSelectedIds(new Set());
      await fetchEvent();
    } catch (err) {
      showToast('error', 'Deletion Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  const handleDownloadSelected = async () => {
    const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
    
    showToast('success', 'Downloading...', `Starting download for ${selectedPhotos.length} photos.`);
    
    for (const photo of selectedPhotos) {
      try {
        const response = await fetch(photo.supabase_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = photo.file_name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        // Small delay to prevent browser being overwhelmed
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error('Download failed for', photo.file_name, err);
      }
    }
  };

  const updateEventSetting = async (key, value, successTitle, successMsg) => {
    if (!event) return;
    setActionLoading({ loading: true, message: 'Updating Settings...' });
    try {
      const { error } = await supabase
        .from('events')
        .update({ [key]: value })
        .eq('id', id);

      if (error) throw error;
      showToast('success', successTitle, successMsg);
      await fetchEvent();
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  const handleTogglePublic = () => {
    const next = !event.is_public;
    updateEventSetting(
      'is_public', 
      next, 
      next ? 'Link Enabled' : 'Link Disabled', 
      next ? 'Guests can now view the gallery.' : 'Public access has been suspended.'
    );
  };

  const handleToggleDownload = () => {
    const next = !event.allow_download;
    updateEventSetting(
      'allow_download', 
      next, 
      next ? 'Downloads Enabled' : 'Downloads Disabled', 
      next ? 'Guests can now download their selected photos.' : 'Guest downloads have been disabled.'
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

  if (loading && !event) {
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
          onClick={() => navigate('/studio')}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Event Header */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7 mb-6">
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
              {/* Photo quota */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-2.5 min-w-[140px] shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Images size={14} className="text-teal-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Photos</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-lg font-bold text-zinc-900">{photos.length}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">/ {event.photos_limit}</p>
                </div>
                <div className="mt-1.5 h-1 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${quotaFull ? 'bg-red-500' : quotaWarning ? 'bg-amber-400' : 'bg-teal-500'}`}
                    style={{ width: `${photoPercent}%` }}
                  />
                </div>
              </div>

              {/* Upgrade button - forced to same height via items-stretch */}
              {!showUpgrade && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="flex flex-col items-center justify-center gap-1 px-5 rounded-xl text-xs font-bold border-2 border-teal-200 text-teal-700 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-400 hover:shadow-md transition-all active:scale-95"
                >
                  <ArrowUp size={14} className="mb-[-2px]" />
                  <span>Upgrade Plan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quota warning / full banners */}
        {quotaFull && !showUpgrade && (
          <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6">
            <div>
              <p className="text-sm font-bold text-red-700">📛 Photo quota reached</p>
              <p className="text-xs text-red-500 mt-0.5">You've used all {event.photos_limit} photos. Upgrade to continue uploading.</p>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold silk-gradient text-white shadow hover:opacity-90 active:scale-95 transition-all"
            >
              <ArrowUp size={12} /> Upgrade Now
            </button>
          </div>
        )}

        {quotaWarning && !quotaFull && !showUpgrade && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-6">
            <div>
              <p className="text-sm font-bold text-amber-700">⚠️ Quota almost full</p>
              <p className="text-xs text-amber-600 mt-0.5">{photos.length} of {event.photos_limit} photos used — consider upgrading soon.</p>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 border-amber-300 text-amber-700 hover:bg-amber-100 transition-all"
            >
              <ArrowUp size={12} /> Add More
            </button>
          </div>
        )}

        {/* Upgrade Panel */}
        {showUpgrade && (
          <UpgradePlan
            event={event}
            user={user}
            onUpgraded={handleUpgraded}
            onClose={() => setShowUpgrade(false)}
          />
        )}

        {/* Sharing & Privacy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 border border-zinc-50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${event.is_public ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  {event.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 leading-none">Guest Link</h3>
                  <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter transition-colors" color={event.is_public ? 'text-teal-600' : 'text-zinc-400'}>
                    {event.is_public ? 'Public & Active' : 'Hidden & Disabled'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button 
                onClick={handleTogglePublic}
                className={`w-11 h-6 rounded-full p-1 transition-all duration-300 ${event.is_public ? 'bg-teal-500' : 'bg-zinc-200'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${event.is_public ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex gap-2">
              <input 
                readOnly
                value={`${window.origin}/v/${id}`}
                className={`flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-xs font-mono transition-opacity ${event.is_public ? 'opacity-100 text-zinc-500' : 'opacity-40 text-zinc-400'}`}
              />
              <button 
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-30"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Permissions Toggles */}
            <div className="mt-6 pt-6 border-t border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${event.allow_download ? 'bg-teal-50 text-teal-600' : 'bg-zinc-100 text-zinc-400'}`}>
                    <Download size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Allow Guest Downloads</h4>
                    <p className="text-[10px] text-zinc-400">Guests can download their hearted photos</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleDownload}
                  className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${event.allow_download ? 'bg-teal-500' : 'bg-zinc-200'}`}
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

          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 border border-zinc-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <Lock size={16} />
                </div>
                <h3 className="font-bold text-zinc-900">Password Protection</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Secure your event. Leave blank to disable.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text"
                  placeholder="Set password..."
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-700 outline-none focus:border-teal-500 transition-all"
                />
              </div>
              <button 
                onClick={handleSavePassword}
                disabled={isSavingPassword || tempPassword === (event.password || '')}
                className="px-6 py-2.5 rounded-xl silk-gradient text-white text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-teal-500/10"
              >
                {isSavingPassword ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
              </button>
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
              ? 'border-teal-500 bg-teal-50 scale-[1.01] cursor-pointer'
              : 'border-zinc-200 bg-white hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'silk-gradient' : 'bg-zinc-100'}`}>
              <CloudUpload size={28} className={isDragging ? 'text-white' : 'text-zinc-400'} />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-800">
                {quotaFull ? 'Quota reached — upgrade to upload more' : isDragging ? 'Drop photos here' : 'Drag & drop photos here'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">or click to browse · Max 50 MB per photo · JPG, PNG, WEBP, HEIC</p>
            </div>
            {!quotaFull && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="silk-gradient text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
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

        {/* Photo Grid Section */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7">
          
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-zinc-100 mb-8">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'all' ? 'text-teal-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              All Photos
              {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('selected')}
              className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-1.5 ${activeTab === 'selected' ? 'text-pink-500' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Guest Selections
              <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${activeTab === 'selected' ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-400'}`}>
                {photos.filter(p => (p.likes_count || 0) > 0).length}
              </div>
              {activeTab === 'selected' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-full" />}
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                {activeTab === 'all' ? 'Event Gallery' : 'Guest Favorites'}
              </h2>
              {photos.length > 0 && (
                <button 
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-teal-600 transition-colors"
                >
                  {photos.filter(p => activeTab === 'all' || (p.likes_count || 0) > 0).every(p => selectedIds.has(p.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                  {photos.filter(p => activeTab === 'all' || (p.likes_count || 0) > 0).every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            
            {/* Selection Actions Bar (Sticky) */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-xs font-bold text-zinc-500 mr-2">{selectedIds.size} Selected</span>
                {activeTab === 'selected' && (
                  <button 
                    onClick={handleDownloadSelected}
                    className="p-2 rounded-lg bg-zinc-50 text-zinc-600 hover:bg-teal-50 hover:text-teal-600 transition-all shadow-sm"
                    title="Download Selected"
                  >
                    <Download size={16} />
                  </button>
                )}
                {activeTab === 'all' && (
                  <button 
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="p-2 rounded-lg bg-zinc-50 text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm disabled:opacity-50"
                    title="Delete Selected"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </div>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <ImageIcon size={40} className="mb-3 opacity-30" />
              <p className="font-medium">No photos yet</p>
              <p className="text-sm mt-1">Upload photos using the zone above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos
                .filter(photo => activeTab === 'all' || (photo.likes_count || 0) > 0)
                .map(photo => (
                <div
                  key={photo.id}
                  className={`group relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${selectedIds.has(photo.id) ? 'ring-4 ring-teal-500/20' : 'bg-zinc-100'}`}
                >
                  {photo.supabase_url ? (
                    <img
                      src={photo.supabase_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Loader2 size={20} className="animate-spin text-zinc-300" />
                    </div>
                  )}

                  {/* Heart Badge (Admin only) */}
                  {(photo.likes_count || 0) > 0 && (
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-1 rounded-lg bg-white/90 backdrop-blur-md shadow-sm border border-pink-100 flex items-center gap-1 animate-in zoom-in duration-300">
                      <Heart size={10} className="text-pink-500" fill="currentColor" />
                      <span className="text-[10px] font-black text-pink-600">{photo.likes_count}</span>
                    </div>
                  )}

                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                    className={`absolute inset-0 transition-opacity duration-200 cursor-pointer ${selectedIds.has(photo.id) ? 'bg-teal-500/20 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}
                  >
                    {/* Checkbox Trigger Area */}
                    <div className="absolute top-3 right-3">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white/20 border-white/40'}`}>
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
