import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { uploadToR2, getSignedPhotoUrls, deleteFromR2, buildR2RefUrl } from '../lib/s3';
import imageCompression from 'browser-image-compression';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  ArrowLeft, QrCode, Download, Copy, Check, RefreshCw,
  Images, CalendarDays, Tag, Loader2, ExternalLink,
  Upload, X, CheckCircle, AlertCircle, ImageIcon, CloudUpload,
  Eye, EyeOff, Trash2, Square, CheckSquare, MonitorOff, Palette,
  FolderOpen,
} from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { loadModels, extractMultipleEmbeddings } from '../lib/faceApi';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
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

function EventSkeleton() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6 animate-pulse">
        <div className="w-32 h-4 bg-zinc-200 rounded-full mb-6" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>
        <div className="bg-white rounded-2xl p-7 border border-zinc-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <SkeletonBlock key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .skeleton-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: shimmer 1.5s infinite; }
      `}} />
    </DashboardLayout>
  );
}

function ActionOverlay({ message = 'Processing...' }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-md" />
      <div className="relative bg-white rounded-3xl shadow-2xl border border-zinc-100 p-8 flex flex-col items-center gap-4 min-w-[240px] animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
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

// ── Compression options ──────────────────────────────────────────────────────
const getCompressionOptions = (maxMb) => ({
  maxSizeMB:        Math.min(maxMb, 2),
  maxWidthOrHeight: 3840,
  useWebWorker:     true,
  preserveExifData: true,
});

export default function QRUpload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [event,        setEvent]        = useState(null);
  const [photos,       setPhotos]       = useState([]);
  const [photoCount,   setPhotoCount]   = useState(0);
  const [storageUsed,  setStorageUsed]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);
  const [signedUrls,   setSignedUrls]   = useState({});
  const [stagedFiles,  setStagedFiles]  = useState([]);
  const [uploadState,  setUploadState]  = useState({ phase: 'idle', current: 0, total: 0, percent: 0, message: '' });
  const [isDragging,   setIsDragging]   = useState(false);
  const [toast,        setToast]        = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, confirmText: 'Delete', isDestructive: true });
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [actionLoading,setActionLoading]= useState({ loading: false, message: '' });
  const [showGallery,  setShowGallery]  = useState(false);
  const [quotaModal,   setQuotaModal]   = useState({ show: false, currentUsed: 0, trying: 0 });

  const fileInputRef      = useRef(null);
  const folderInputRef    = useRef(null);
  const cancelUploadRef   = useRef(false);
  const [selectedFolderName, setSelectedFolderName] = useState(null);

  const GLOBAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB

  const handleFolderPick = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const files = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (file.type.startsWith('image/')) files.push(file);
          }
        }
        if (files.length) {
          setSelectedFolderName(dirHandle.name);
          stageFiles(files);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      folderInputRef.current?.click();
    }
  };

  const qrViewUrl = `${window.location.origin}/qr/${id}`;

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const triggerConfirm = (title, message, action, confirmText = 'Delete', isDestructive = true) =>
    setConfirmModal({ isOpen: true, title, message, action, confirmText, isDestructive });
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // Signed URLs
  useEffect(() => {
    if (!photos.length) return;
    getSignedPhotoUrls(photos).then(urls => {
      if (Object.keys(urls).length) setSignedUrls(prev => ({ ...prev, ...urls }));
    });
  }, [photos]);

  const getPhotoUrl = useCallback((photo) => signedUrls[photo.id] || photo.supabase_url || null, [signedUrls]);

  /* ── Fetch event, photos, storage, models ── */
  const fetchData = useCallback(async () => {
    if (!user) return;

    const [{ data: ev }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      loadModels(),
    ]);

    setEvent(ev);

    const { data: allPh } = await supabase
      .from('photos')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: false });

    setPhotos((allPh ?? []).filter(p => p.source === 'qr_gallery'));

    const [countRes, sizeRes] = await Promise.all([
      supabase.rpc('get_user_photo_count', { p_user_id: user.id }),
      supabase.from('photos').select('size_bytes').eq('user_id', user.id),
    ]);

    setPhotoCount(countRes.data ?? 0);
    const totalSize = (sizeRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
    setStorageUsed(totalSize);
    
    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Stage files ── */
  const stageFiles = useCallback(async (files) => {
    if (!user || !event) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!validFiles.length) return;

    setStagedFiles(prev => {
      const existingNames = new Set([
        ...photos.map(p => p.file_name),
        ...prev.map(s => s.file.name),
      ]);
      const uniqueFiles = validFiles.filter(f => !existingNames.has(f.name));
      const dupeCount   = validFiles.length - uniqueFiles.length;
      if (dupeCount > 0) {
        setTimeout(() => showToast('error', 'Duplicates Skipped', `${dupeCount} photo${dupeCount > 1 ? 's' : ''} already exist and were not added.`), 0);
      }
      const newItems = uniqueFiles.map(f => ({
        id:         Math.random().toString(36).slice(2),
        file:       f,
        previewUrl: URL.createObjectURL(f),
      }));
      return [...prev, ...newItems];
    });
  }, [user, event, photos]);

  const removeStagedFile = (id) => setStagedFiles(prev => prev.filter(f => f.id !== id));

  /* ── Upload stash with compression ── */
  const startUpload = async () => {
    if (!stagedFiles.length || !user || !event) return;

    // Storage validation (pre-check)
    const stagedTotalSize = stagedFiles.reduce((acc, f) => acc + f.file.size, 0);
    if (storageUsed + stagedTotalSize > GLOBAL_STORAGE_LIMIT) {
       setQuotaModal({
         show:        true,
         currentUsed: storageUsed,
         trying:      stagedTotalSize
       });
       return;
    }

    cancelUploadRef.current = false;
    let cancelled = false;
    const maxMb = 20; // Hardcoded global max

    // ── Phase 1: Compress all images first ──────────────────────────────────
    const compressedItems = [];
    for (let i = 0; i < stagedFiles.length; i++) {
      if (cancelUploadRef.current) { cancelled = true; break; }
      const item = stagedFiles[i];
      const pct  = Math.round((i / stagedFiles.length) * 100);
      setUploadState({ phase: 'compressing', current: i + 1, total: stagedFiles.length, percent: pct, message: item.file.name });
      try {
        const compressed = await imageCompression(item.file, getCompressionOptions(maxMb));
        compressedItems.push({ ...item, compressed });
      } catch (err) {
        console.error('Compression failed for', item.file.name, err);
        compressedItems.push({ ...item, compressed: item.file }); // fall back to original
      }
      setUploadState({ phase: 'compressing', current: i + 1, total: stagedFiles.length, percent: Math.round(((i + 1) / stagedFiles.length) * 100), message: item.file.name });
    }

    if (cancelled) {
      cancelUploadRef.current = false;
      setUploadState({ phase: 'idle', current: 0, total: 0, percent: 0, message: '' });
      setStagedFiles([]);
      setSelectedFolderName(null);
      return;
    }

    // ── Phase 2: Upload all compressed images ───────────────────────────────
    const remainingStash = [...stagedFiles];
    let uploaded = 0;

    for (let i = 0; i < compressedItems.length; i++) {
      if (cancelUploadRef.current) { cancelled = true; break; }
      const item = compressedItems[i];
      const pct  = Math.round((i / compressedItems.length) * 100);
      setUploadState({ phase: 'uploading', current: i + 1, total: compressedItems.length, percent: pct, message: item.file.name });

      // Double check storage limit before each file upload
      if (storageUsed + item.compressed.size > GLOBAL_STORAGE_LIMIT) {
        showToast('error', 'Storage Full', 'Global storage limit of 10GB reached.');
        break;
      }

      // Skip if a photo with the same name was already uploaded
      const alreadyUploaded = photos.some(p => p.file_name === item.file.name);
      if (alreadyUploaded) {
        const idx = remainingStash.findIndex(s => s.id === item.id);
        if (idx !== -1) { remainingStash.splice(idx, 1); setStagedFiles([...remainingStash]); }
        continue;
      }

      try {
        const ext         = item.file.name.split('.').pop();
        const fileName    = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const folderName  = event.name ? event.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : event.id;
        const storagePath = `${user.id}/${folderName}/qrupload/${fileName}`;

        await uploadToR2(item.compressed, storagePath);
        const refUrl = buildR2RefUrl(storagePath);

        const { data: insertedPhoto, error: dbErr } = await supabase.from('photos').insert({
          event_id:     event.id,
          user_id:      user.id,
          storage_path: storagePath,
          file_name:    item.file.name,
          size_bytes:   item.compressed.size,
          supabase_url: refUrl,
          source:       'qr_gallery',
        }).select('id').single();

        if (dbErr) throw new Error(dbErr.message);

        // Face embeddings
        try {
          const img        = await faceapi.bufferToImage(item.file);
          const detections = await extractMultipleEmbeddings(img);
          if (detections?.length > 0) {
            const embeds = detections.map(det => ({
              photo_id:  insertedPhoto.id,
              embedding: `[${Array.from(det.descriptor).join(',')}]`,
            }));
            await supabase.from('face_embeddings').insert(embeds);
          }
        } catch (faceErr) {
          console.error('Face processing failed for', item.file.name, faceErr);
        }

        // Remove uploaded item from staged stash
        const idx = remainingStash.findIndex(s => s.id === item.id);
        if (idx !== -1) { remainingStash.splice(idx, 1); setStagedFiles([...remainingStash]); }
        uploaded++;
        setUploadState({ phase: 'uploading', current: i + 1, total: compressedItems.length, percent: Math.round(((i + 1) / compressedItems.length) * 100), message: item.file.name });

      } catch (err) {
        console.error('Upload error:', err);
        showToast('error', 'Upload failed', `Failed to upload ${item.file.name}: ${err.message}`);
      }
    }

    cancelUploadRef.current = false;
    setUploadState({ phase: 'idle', current: 0, total: 0, percent: 0, message: '' });

    if (cancelled) {
      setStagedFiles([]);
      setSelectedFolderName(null);
    }

    if (uploaded > 0) {
      if (!cancelled) setSelectedFolderName(null);
      showToast('success', cancelled ? 'Upload Paused' : 'Upload Complete', `${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded successfully.`);
      await fetchData();
    }
  };

  const handleDrop      = useCallback((e) => { e.preventDefault(); setIsDragging(false); stageFiles(Array.from(e.dataTransfer.files)); }, [stageFiles]);
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleFilePick  = (e) => { stageFiles(Array.from(e.target.files)); e.target.value = ''; };

  // Quota info
  const storagePercent = Math.min(100, (storageUsed / GLOBAL_STORAGE_LIMIT) * 100);
  const quotaFull    = storageUsed >= GLOBAL_STORAGE_LIMIT;
  const quotaWarning = storagePercent >= 90 && !quotaFull;

  /* ── Event Settings ── */
  const updateEventSetting = async (key, value, successTitle, successMsg) => {
    if (!event) return;
    setActionLoading({ loading: true, message: 'Updating...' });
    try {
      const { error } = await supabase.from('events').update({ [key]: value }).eq('id', id);
      if (error) throw error;
      showToast('success', successTitle, successMsg);
      await fetchData();
    } catch (err) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  const handleToggleLive       = () => updateEventSetting('is_qr_live', !event.is_qr_live, event.is_qr_live ? 'QR Disabled' : 'QR Enabled', event.is_qr_live ? 'Gallery hidden.' : 'Guests can now view the gallery.');
  const handleToggleDownload   = () => updateEventSetting('allow_download', !event.allow_download, 'Downloads Updated', '');
  const handleToggleScreenshot = () => updateEventSetting('allow_screenshot', !event.allow_screenshot, 'Screenshot Protection Updated', '');

  /* ── Copy QR ── */
  const handleCopy = () => {
    navigator.clipboard.writeText(qrViewUrl);
    setCopied(true);
    showToast('success', 'Link Copied', 'QR gallery link copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Download QR ── */
  const handleDownloadQR = () => {
    const svg = document.getElementById('event-qr-svg');
    if (!svg) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.download = `${event?.name ?? 'event'}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  /* ── Selection ── */
  const toggleSelect   = (photoId) => setSelectedIds(prev => { const n = new Set(prev); n.has(photoId) ? n.delete(photoId) : n.add(photoId); return n; });
  const handleSelectAll = () => {
    const allSel = photos.every(p => selectedIds.has(p.id));
    setSelectedIds(allSel ? new Set() : new Set(photos.map(p => p.id)));
  };

  /* ── Delete selected ── */
  const handleDeleteSelected = () => {
    triggerConfirm(
      'Delete Selected Photos',
      `Permanently delete ${selectedIds.size} photos? This cannot be undone.`,
      async () => {
        closeConfirm();
        setActionLoading({ loading: true, message: `Deleting ${selectedIds.size} Photos…` });
        try {
          const selPhotos = photos.filter(p => selectedIds.has(p.id));
          const paths = selPhotos.filter(p => !p.supabase_url?.includes('supabase.co')).map(p => p.storage_path);
          if (paths.length) await deleteFromR2(paths);

          const { error: dbErr } = await supabase.from('photos').delete().in('id', Array.from(selectedIds));
          if (dbErr) throw dbErr;

          setSignedUrls(prev => { const n = { ...prev }; Array.from(selectedIds).forEach(id => delete n[id]); return n; });
          showToast('success', 'Deleted', `${selectedIds.size} photos removed.`);
          setSelectedIds(new Set());
          await fetchData();
        } catch (err) {
          showToast('error', 'Deletion Failed', err.message);
        } finally {
          setActionLoading({ loading: false, message: '' });
        }
      }
    );
  };

  if (loading) return <EventSkeleton />;
  if (!event) return <DashboardLayout><div className="text-center py-20 text-zinc-500">Event not found.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">

        {/* Back button */}
        <button
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-violet-700 mb-5 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Event
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-6 w-full overflow-hidden">
          <button onClick={() => navigate('/studio')} className="hover:text-violet-700 hover:underline transition-colors shrink-0">Dashboard</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <button onClick={() => navigate('/events')} className="hover:text-violet-700 hover:underline transition-colors shrink-0">Events</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <button onClick={() => navigate(`/events/${id}`)} className="hover:text-violet-700 hover:underline transition-colors truncate max-w-[150px]">{event.name}</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <span className="text-zinc-900 font-bold shrink-0">QR Management</span>
        </nav>

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

            {/* Photo count + storage quota */}
            <div className="flex gap-4 items-stretch">
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-6 py-4">
                <Images size={20} className="text-violet-500" />
                <div>
                  <p className="text-2xl font-black text-violet-700">{photos.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">QR Photos</p>
                </div>
              </div>

              {/* Global storage badge */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-2.5 min-w-[160px] shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <CloudUpload size={14} className="text-violet-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Global Storage</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-lg font-bold text-zinc-900">{formatBytes(storageUsed)}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">/ 10 GB</p>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">across all events</p>
                <div className="mt-1.5 h-1 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${quotaFull ? 'bg-red-500' : quotaWarning ? 'bg-amber-400' : 'bg-violet-500'}`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quota banners */}
        {quotaFull && (
          <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6">
            <div>
              <p className="text-sm font-bold text-red-700">📛 Global storage limit reached</p>
              <p className="text-xs text-red-500 mt-0.5">
                You've used all 10 GB of storage. Delete some photos to upload more.
              </p>
            </div>
          </div>
        )}
        {quotaWarning && !quotaFull && (
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-6">
            <p className="text-sm font-bold text-amber-700">⚠️ Approaching global storage limit — {formatBytes(storageUsed)} of 10 GB used</p>
          </div>
        )}

        {/* Live Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${event.is_qr_live ? 'bg-green-50 border border-green-100' : 'bg-zinc-50 border border-zinc-100'}`}>
          <div className={`w-3 h-3 rounded-full shrink-0 ${event.is_qr_live ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`} />
          <div>
            <p className={`text-sm font-bold ${event.is_qr_live ? 'text-green-700' : 'text-zinc-500'}`}>
              {event.is_qr_live ? 'Gallery is LIVE' : 'Gallery is OFFLINE'}
            </p>
            <p className="text-[10px] text-zinc-400">
              {event.is_qr_live ? 'Guests can access via QR scan' : 'Toggle on to make it accessible'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Live Toggle Card */}
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
                <button
                  onClick={handleToggleLive}
                  className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${event.is_qr_live ? 'bg-green-500' : 'bg-zinc-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${event.is_qr_live ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>

              <p className="text-sm text-zinc-500 mb-6">
                {event.is_qr_live
                  ? 'Anyone with the QR code or link can view photos from this gallery.'
                  : 'The QR gallery is currently hidden. Enable it to allow guests to view photos.'}
              </p>

            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100">
              <div className="space-y-4">
                {/* Allow Download */}
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

                {/* Screenshot Protection */}
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

                {/* Theme Color */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Palette size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">QR Theme Color</h4>
                      <p className="text-[10px] text-zinc-400">Match your wedding style</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={event.theme_color || '#5b21b6'}
                      onChange={(e) => setEvent({ ...event, theme_color: e.target.value })}
                      onBlur={(e) => {
                        let v = event.theme_color || '#5b21b6';
                        if (!v.startsWith('#')) v = '#' + v;
                        updateEventSetting('theme_color', v, 'Theme Updated', 'Color changed.');
                      }}
                      className="w-20 px-2 py-1.5 text-xs font-mono uppercase bg-zinc-50 border border-zinc-200 rounded outline-none focus:border-violet-500 text-zinc-700"
                      maxLength={7}
                    />
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-200 shadow-sm shrink-0">
                      <input
                        type="color"
                        value={event.theme_color || '#5b21b6'}
                        onChange={(e) => setEvent({ ...event, theme_color: e.target.value })}
                        onBlur={(e) => updateEventSetting('theme_color', e.target.value, 'Theme Updated', 'Color changed.')}
                        className="absolute -top-2 -left-2 w-12 h-12 p-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 border border-zinc-50">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
                <QrCode size={16} />
              </div>
              <h2 className="font-bold text-zinc-900">Scan to View</h2>
            </div>

            <div className="flex justify-center mb-6">
              <div className="p-5 bg-white rounded-2xl border-2 border-violet-100 shadow-lg shadow-violet-500/10">
                <QRCodeSVG
                  id="event-qr-svg"
                  value={qrViewUrl}
                  size={180}
                  bgColor="#ffffff"
                  fgColor={event.theme_color || '#5b21b6'}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-400 text-center mb-6">
              Guests scan this QR to view and download photos from this gallery.
            </p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-violet-200 text-violet-700 text-sm font-bold hover:bg-violet-50 transition-all active:scale-95"
              >
                <Download size={16} /> Download QR
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all active:scale-95 shadow-lg"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input readOnly value={qrViewUrl} className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-500 outline-none" />
              <a href={qrViewUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-all">
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
          onClick={() => !quotaFull && uploadState.phase === 'idle' && fileInputRef.current?.click()}
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
                {quotaFull ? 'Global storage full' : uploadState.phase !== 'idle' ? (uploadState.phase === 'compressing' ? 'Compressing photos…' : 'Uploading photos…') : isDragging ? 'Drop photos here' : 'Select photos to upload'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">Images are automatically compressed before upload</p>
            </div>
            {!quotaFull && (
              <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  <Upload size={14} /> Select Photos
                </button>
                <button
                  type="button"
                  onClick={handleFolderPick}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-violet-700 border-2 border-violet-200 bg-white shadow transition-all active:scale-95 hover:border-violet-400 max-w-[180px]"
                >
                  <FolderOpen size={14} className="shrink-0" />
                  <span className="truncate">{selectedFolderName ?? 'Select Folder'}</span>
                </button>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFilePick} />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            // @ts-ignore
            webkitdirectory="true"
            onChange={(e) => { stageFiles(Array.from(e.target.files)); e.target.value = ''; }}
          />
        </div>

        {/* Upload Progress */}
        {uploadState.phase !== 'idle' && uploadState.total > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7 mb-6 animate-in fade-in duration-300 border border-violet-100">

            {/* Phase tabs */}
            <div className="flex items-center gap-2 mb-5">
              {[
                { key: 'compressing', label: 'Compressing', color: 'amber' },
                { key: 'uploading',   label: 'Uploading',   color: 'violet' },
              ].map(({ key, label, color }) => {
                const isActive = uploadState.phase === key;
                const isDone   = key === 'compressing' && uploadState.phase === 'uploading';
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    isActive
                      ? color === 'amber'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-violet-50 border-violet-200 text-violet-700'
                      : isDone
                      ? 'bg-green-50 border-green-200 text-green-600'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                  }`}>
                    {isDone
                      ? <CheckCircle size={12} />
                      : isActive
                      ? <Loader2 size={12} className="animate-spin" />
                      : <div className="w-3 h-3 rounded-full border-2 border-current opacity-40" />
                    }
                    {label}
                  </div>
                );
              })}
              <div className="ml-auto">
                <button
                  onClick={() => { cancelUploadRef.current = true; }}
                  className="px-4 py-1.5 text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 rounded-full transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Current file */}
            <p className="text-xs text-zinc-400 truncate mb-3">
              {uploadState.phase === 'compressing' ? 'Compressing' : 'Uploading'}: <span className="text-zinc-600 font-medium">{uploadState.message}</span>
            </p>

            {/* Progress bar */}
            <div className="relative h-3 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200/60">
              <div
                className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-300 ${
                  uploadState.phase === 'compressing'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                }`}
                style={{ width: `${uploadState.percent}%` }}
              />
            </div>

            {/* Counter + percent */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-zinc-400">
                {uploadState.current} <span className="text-zinc-300">/ {uploadState.total}</span> photos
              </p>
              <p className={`text-sm font-black ${uploadState.phase === 'compressing' ? 'text-amber-500' : 'text-violet-600'}`}>
                {uploadState.percent}%
              </p>
            </div>
          </div>
        )}

        {/* Staged Files */}
        {uploadState.phase === 'idle' && stagedFiles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 mb-6 relative animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black">{stagedFiles.length}</span>
                  Photos Ready to Upload
                  {quotaFull && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-black animate-in fade-in duration-200">
                      <X size={10} strokeWidth={3} />
                      Storage Full
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Will be compressed automatically before uploading.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setStagedFiles([]); setSelectedFolderName(null); }} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-red-500 hover:bg-zinc-50 rounded-xl transition-all">Clear All</button>
                <button onClick={startUpload} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md text-sm font-bold active:scale-95 transition-all">
                  <CloudUpload size={16} /> Upload Now
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {stagedFiles.map(staged => (
                <div key={staged.id} className="relative aspect-square rounded-xl bg-zinc-100 overflow-hidden group">
                  <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); removeStagedFile(staged.id); }} className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                  {staged.previewUrl
                    ? <img src={staged.previewUrl} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-full h-full p-4 text-zinc-300" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">QR Gallery Photos</h2>
              {showGallery && photos.length > 0 && (
                <button onClick={handleSelectAll} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-violet-600 transition-colors">
                  {photos.every(p => selectedIds.has(p.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                  {photos.every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {showGallery && selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 mr-2">{selectedIds.size} Selected</span>
                <button onClick={handleDeleteSelected} className="p-2 rounded-lg bg-zinc-50 text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm" title="Delete Selected">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            {showGallery && photos.length > 0 && selectedIds.size === 0 && (
              <button onClick={fetchData} className="p-2 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 transition-all" title="Refresh">
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {!showGallery ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 rounded-xl border border-zinc-100">
              <Images size={40} className="text-violet-200 mb-4" />
              <p className="text-zinc-600 font-medium mb-1">Gallery preview hidden</p>
              <p className="text-xs text-zinc-400 mb-6 max-w-sm text-center">Click below to load uploaded photos.</p>
              <button onClick={() => setShowGallery(true)} className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-md active:scale-95 flex items-center gap-2">
                <Eye size={16} /> View Photos
              </button>
            </div>
          ) : photos.length === 0 ? (
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
                    <img src={getPhotoUrl(photo)} alt={photo.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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

      {/* Storage Full Modal */}
      {quotaModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuotaModal(m => ({ ...m, show: false }))} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={24} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-black text-zinc-900 text-center mb-3">Global Storage Full</h2>
            <p className="text-sm text-zinc-500 text-center mb-1">
              Your global storage limit of 10 GB has been reached.
            </p>
            <p className="text-sm text-zinc-500 text-center mb-6">
              You are trying to upload <span className="font-bold text-zinc-800">{formatBytes(quotaModal.trying)}</span>, but only <span className="font-bold text-teal-600">{formatBytes(Math.max(0, GLOBAL_STORAGE_LIMIT - quotaModal.currentUsed))}</span> is remaining.
            </p>
            <button
              onClick={() => setQuotaModal(m => ({ ...m, show: false }))}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all active:scale-95"
            >
              OK, I'll check my photos
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action || closeConfirm}
        onCancel={closeConfirm}
        confirmText={confirmModal.confirmText ?? 'Delete'}
        isDestructive={confirmModal.isDestructive ?? true}
      />
      {actionLoading.loading && <ActionOverlay message={actionLoading.message} />}
    </DashboardLayout>
  );
}
