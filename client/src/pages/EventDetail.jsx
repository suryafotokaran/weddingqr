import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadToR2, getSignedPhotoUrls, deleteFromR2, buildR2RefUrl } from '../lib/s3';
import imageCompression from 'browser-image-compression';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  Upload, X, CheckCircle, AlertCircle, Loader2, ImageIcon,
  CalendarDays, Tag, Images, CloudUpload, ArrowLeft, FolderOpen,
  Lock, Copy, Check, Trash2, Download, Square, CheckSquare,
  Eye, EyeOff, Heart, MonitorOff, Users, RotateCcw, Clock, MessageCircle, Send, Pencil
} from 'lucide-react';

const getCompressionOptions = (maxMb) => ({
  maxSizeMB:        Math.min(maxMb, 2),
  maxWidthOrHeight: 3840,
  useWebWorker:     true,
  preserveExifData: true,
});

// Per-file size limit defaults to 50 MB — overridden dynamically from event.max_image_size_mb

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
  const user = userData?.user;  const [event, setEvent]           = useState(null);
  const [photos, setPhotos]         = useState([]);
  const [allPhotos, setAllPhotos]   = useState([]);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [uploadState, setUploadState] = useState({ phase: 'idle', current: 0, total: 0, percent: 0, message: '' });
  const [quotaModal,  setQuotaModal]  = useState({ show: false, currentUsed: 0, trying: 0 });
  const [loading, setLoading]       = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast]           = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState({ loading: false, message: '' });
  const [guestSubmissions, setGuestSubmissions] = useState([]);
  const [photoComments, setPhotoComments] = useState({}); // photoId → [{...}]
  const [replyDraft, setReplyDraft] = useState({}); // photoId → draft string
  const [sendingReply, setSendingReply] = useState(null); // photoId currently sending
  const [replacingPhotoId, setReplacingPhotoId] = useState(null); // photoId currently being replaced
  const replaceInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showGallery, setShowGallery] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null });
  const [photoCount, setPhotoCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);

  const GLOBAL_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB

  const triggerConfirm = (title, message, action) => {
    setConfirmModal({ isOpen: true, title, message, action });
  };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
  const [signedUrls, setSignedUrls] = useState({});
  const fileInputRef    = useRef(null);
  const cancelUploadRef = useRef(false);

  const removeStagedFile = (sid) => setStagedFiles(prev => prev.filter(f => f.id !== sid));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  // Generate signed GET URLs for iDrive e2 photos whenever the photo list changes
  useEffect(() => {
    if (!photos.length) return;
    getSignedPhotoUrls(photos).then(urls => {
      if (Object.keys(urls).length) setSignedUrls(prev => ({ ...prev, ...urls }));
    });
  }, [photos]);

  // Returns the best available URL for a photo (signed iDrive URL or Supabase fallback)
  const getPhotoUrl = useCallback((photo) => {
    return signedUrls[photo.id] || photo.supabase_url || null;
  }, [signedUrls]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchEvent = useCallback(async (isInitial = false) => {
    if (!user) return;
    if (isInitial) setLoading(true);
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
    // Gallery only shows host-uploaded photos (source='host')
    setPhotos(allPhArr.filter(p => p.source === 'host' || (!p.source && p.user_id)));

    // Fetch global usage
    const [countRes, sizeRes] = await Promise.all([
      supabase.rpc('get_user_photo_count', { p_user_id: user.id }),
      supabase.from('photos').select('size_bytes').eq('user_id', user.id),
    ]);
    setPhotoCount(countRes.data ?? 0);
    const totalSize = (sizeRes.data ?? []).reduce((acc, p) => acc + (p.size_bytes || 0), 0);
    setStorageUsed(totalSize);

    if (isInitial) setLoading(false);
  }, [id, user]);

  useEffect(() => { 
    if (event) setTempPassword(event.password || '');
  }, [event]);

  useEffect(() => { fetchEvent(true); }, [fetchEvent]);

  const fetchGuestSubmissions = useCallback(async () => {
    const { data } = await supabase
      .from('guest_submissions')
      .select('*')
      .eq('event_id', id)
      .order('submitted_at', { ascending: false });
    setGuestSubmissions(data ?? []);
  }, [id]);

  useEffect(() => { fetchGuestSubmissions(); }, [fetchGuestSubmissions]);

  const fetchPhotoComments = useCallback(async () => {
    const { data } = await supabase
      .from('photo_comments')
      .select('*')
      .eq('event_id', id)
      .order('created_at', { ascending: true });
    const map = {};
    (data ?? []).forEach(c => {
      if (!map[c.photo_id]) map[c.photo_id] = [];
      map[c.photo_id].push(c);
    });
    setPhotoComments(map);
  }, [id]);

  useEffect(() => { fetchPhotoComments(); }, [fetchPhotoComments]);

  const handleReplacePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !replacingPhotoId || !user || !event) return;
    const photo = photos.find(p => p.id === replacingPhotoId);
    if (!photo) return;

    // Storage check for replacement
    const sizeDiff = file.size - (photo.size_bytes || 0);
    if (storageUsed + sizeDiff > GLOBAL_STORAGE_LIMIT) {
      showToast('error', 'Storage Full', 'Global storage limit reached.');
      return;
    }

    setReplacingPhotoId(null);
    setActionLoading({ loading: true, message: 'Replacing photo…' });
    try {
      const maxMb = event.max_image_size_mb || 20;
      const compressed = await imageCompression(file, getCompressionOptions(maxMb));
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const folderName = event.name ? event.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : event.id;
      const newPath = `${user.id}/${folderName}/photoselection/${fileName}`;
      // Upload new file
      await uploadToR2(compressed, newPath);
      const newRefUrl = buildR2RefUrl(newPath);
      // Update DB record (photo_id stays same — comments stay linked)
      const { error: dbErr } = await supabase.from('photos').update({
        storage_path: newPath,
        supabase_url: newRefUrl,
        file_name: file.name,
        size_bytes: compressed.size,
      }).eq('id', photo.id);
      if (dbErr) throw dbErr;
      // Delete old file from R2
      if (photo.storage_path && !photo.supabase_url?.includes('supabase.co')) {
        await deleteFromR2([photo.storage_path]);
      }
      // Clear stale signed URL so new one is fetched
      setSignedUrls(prev => { const n = { ...prev }; delete n[photo.id]; return n; });
      showToast('success', 'Photo Replaced', 'The photo has been updated successfully.');
      await fetchEvent();
    } catch (err) {
      showToast('error', 'Replace Failed', err.message);
    } finally {
      setActionLoading({ loading: false, message: '' });
    }
  };

  const handlePhotographerReply = async (photoId) => {
    const text = (replyDraft[photoId] || '').trim();
    if (!text || !user) return;
    setSendingReply(photoId);
    await supabase.from('photo_comments').insert({
      photo_id:    photoId,
      event_id:    id,
      sender_type: 'photographer',
      sender_id:   user.id,
      sender_name: 'Photographer',
      message:     text,
    });
    setReplyDraft(prev => ({ ...prev, [photoId]: '' }));
    setSendingReply(null);
    await fetchPhotoComments();
  };

  // ── Stage files (local preview) ───────────────────────────────────────────
  const stageFiles = useCallback((files) => {
    if (!user || !event) return;
    const imageFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) {
        showToast('error', 'Invalid file', `"${f.name}" is not an image.`);
        return false;
      }
      return true;
    });
    if (!imageFiles.length) return;
    setStagedFiles(prev => {
      const uploadedNames = new Set(photos.map(p => p.file_name));
      const stagedNames   = new Set(prev.map(s => s.file.name));
      const unique        = imageFiles.filter(f => !uploadedNames.has(f.name) && !stagedNames.has(f.name));
      const dupeCount     = imageFiles.length - unique.length;
      if (dupeCount > 0) {
        setTimeout(() => showToast('error', 'Duplicates Skipped', `${dupeCount} photo${dupeCount > 1 ? 's' : ''} already exist and were not added.`), 0);
      }
      const newItems = unique.map(f => ({
        id:         Math.random().toString(36).slice(2),
        file:       f,
        previewUrl: URL.createObjectURL(f),
      }));
      return [...prev, ...newItems];
    });
  }, [user, event, photos]);

  // ── Upload staged files: compress all → upload all ────────────────────────
  const startUpload = async () => {
    if (!stagedFiles.length || !user || !event) return;

    // Storage check
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
    const maxMb = event.max_image_size_mb || 20;

    // ── Phase 1: Compress all ────────────────────────────────────────────────
    const compressedItems = [];
    for (let i = 0; i < stagedFiles.length; i++) {
      if (cancelUploadRef.current) { cancelled = true; break; }
      const item = stagedFiles[i];
      setUploadState({ phase: 'compressing', current: i + 1, total: stagedFiles.length, percent: Math.round((i / stagedFiles.length) * 100), message: item.file.name });
      try {
        const compressed = await imageCompression(item.file, getCompressionOptions(maxMb));
        compressedItems.push({ ...item, compressed });
      } catch {
        compressedItems.push({ ...item, compressed: item.file });
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

    // ── Phase 2: Upload all ──────────────────────────────────────────────────
    const remainingStash = [...stagedFiles];
    let uploaded = 0;

    for (let i = 0; i < compressedItems.length; i++) {
      if (cancelUploadRef.current) { cancelled = true; break; }
      const item = compressedItems[i];
      setUploadState({ phase: 'uploading', current: i + 1, total: compressedItems.length, percent: Math.round((i / compressedItems.length) * 100), message: item.file.name });

      // Double check storage limit before each file upload
      if (storageUsed + item.compressed.size > GLOBAL_STORAGE_LIMIT) {
        showToast('error', 'Storage Full', 'Global storage limit reached.');
        break;
      }

      // Skip if already uploaded (safety check)
      if (photos.some(p => p.file_name === item.file.name)) {
        const idx = remainingStash.findIndex(s => s.id === item.id);
        if (idx !== -1) { remainingStash.splice(idx, 1); setStagedFiles([...remainingStash]); }
        continue;
      }

      try {
        const ext         = item.file.name.split('.').pop();
        const fileName    = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const folderName  = event.name ? event.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : event.id;
        const storagePath = `${user.id}/${folderName}/photoselection/${fileName}`;
        await uploadToR2(item.compressed, storagePath);
        const refUrl = buildR2RefUrl(storagePath);
        const { error: dbErr } = await supabase.from('photos').insert({
          event_id:     event.id,
          user_id:      user.id,
          storage_path: storagePath,
          file_name:    item.file.name,
          size_bytes:   item.compressed.size,
          supabase_url: refUrl,
          source:       'host',
        });
        if (dbErr) throw new Error(dbErr.message);
        const idx = remainingStash.findIndex(s => s.id === item.id);
        if (idx !== -1) { remainingStash.splice(idx, 1); setStagedFiles([...remainingStash]); }
        uploaded++;
        setUploadState({ phase: 'uploading', current: i + 1, total: compressedItems.length, percent: Math.round(((i + 1) / compressedItems.length) * 100), message: item.file.name });
      } catch (err) {
        showToast('error', 'Upload failed', `Failed to upload ${item.file.name}: ${err.message}`);
      }
    }

    if (cancelled) {
      setStagedFiles([]);
      setSelectedFolderName(null);
    }

    cancelUploadRef.current = false;
    setUploadState({ phase: 'idle', current: 0, total: 0, percent: 0, message: '' });

    if (uploaded > 0) {
      if (!cancelled) setSelectedFolderName(null);
      showToast('success', cancelled ? 'Upload Paused' : 'Upload Complete', `${uploaded} photo${uploaded !== 1 ? 's' : ''} added to the gallery.`);
      await fetchEvent();
    }
  };

  const readEntryFiles = (entry) => new Promise((resolve) => {
    if (entry.isFile) {
      entry.file(f => resolve([f]));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const allFiles = [];
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) return resolve(allFiles);
          const nested = await Promise.all(entries.map(readEntryFiles));
          allFiles.push(...nested.flat());
          readBatch();
        });
      };
      readBatch();
    } else {
      resolve([]);
    }
  });

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const items = Array.from(e.dataTransfer.items ?? []);
    if (items.length && items[0].webkitGetAsEntry) {
      const entries = items.map(i => i.webkitGetAsEntry()).filter(Boolean);
      const nested  = await Promise.all(entries.map(readEntryFiles));
      stageFiles(nested.flat());
    } else {
      stageFiles(Array.from(e.dataTransfer.files));
    }
  }, [stageFiles]);
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()  => setIsDragging(false);
  const handleFilePick  = (e) => { stageFiles(Array.from(e.target.files)); e.target.value = ''; };

  const folderInputRef = useRef(null);
  const [selectedFolderName, setSelectedFolderName] = useState(null);
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


  const handleUnlockGuest = async (submissionId) => {
    await supabase.from('guest_submissions').update({ is_locked: false }).eq('id', submissionId);
    await fetchGuestSubmissions();
  };

  // Photo quota
  const storagePercent = Math.min(100, (storageUsed / GLOBAL_STORAGE_LIMIT) * 100);
  const quotaFull    = storageUsed >= GLOBAL_STORAGE_LIMIT;
  const quotaWarning = storagePercent >= 90 && !quotaFull;

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

  const handleDeleteSelected = () => {
    triggerConfirm(
      'Delete Selected Photos',
      `Are you sure you want to permanently delete ${selectedIds.size} photos? This cannot be undone.`,
      async () => {
        closeConfirm();
        setActionLoading({ loading: true, message: `Deleting ${selectedIds.size} Photos...` });
        try {
          const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
          
          const r2Paths = selectedPhotos
            .filter(p => !p.supabase_url?.includes('supabase.co'))
            .map(p => p.storage_path);
          if (r2Paths.length) await deleteFromR2(r2Paths);

          // 2. Delete old Supabase Storage photos (if any still selected)
          const supaPaths = selectedPhotos
            .filter(p => p.supabase_url?.includes('supabase.co'))
            .map(p => p.storage_path);
          if (supaPaths.length) {
            await supabase.storage.from('photos').remove(supaPaths);
          }

          // 3. Delete from Database
          const { error: dbErr } = await supabase
            .from('photos')
            .delete()
            .in('id', Array.from(selectedIds));

          if (dbErr) throw dbErr;

          // Clear signed URL cache for deleted photos
          setSignedUrls(prev => {
            const next = { ...prev };
            Array.from(selectedIds).forEach(id => delete next[id]);
            return next;
          });

          showToast('success', 'Deleted', `${selectedIds.size} photos removed successfully.`);
          setSelectedIds(new Set());
          await fetchEvent();
        } catch (err) {
          showToast('error', 'Deletion Failed', err.message);
        } finally {
          setActionLoading({ loading: false, message: '' });
        }
      }
    );
  };

  // Clear ALL photos from this event — deletes from storage + DB
  const handleClearAllPhotos = () => {
    if (!photos.length) return;
    triggerConfirm(
      'Clear All Photos',
      `This will permanently delete all ${photos.length} photos from this event and storage. This cannot be undone.`,
      async () => {
        closeConfirm();
        setActionLoading({ loading: true, message: `Clearing all ${photos.length} photos…` });
        try {
          const r2Paths = photos
            .filter(p => p.storage_path && !p.supabase_url?.includes('supabase.co'))
            .map(p => p.storage_path);
          if (r2Paths.length) await deleteFromR2(r2Paths);

          // 2. Delete old Supabase Storage photos
          const supaPaths = photos
            .filter(p => p.storage_path && p.supabase_url?.includes('supabase.co'))
            .map(p => p.storage_path);
          if (supaPaths.length) {
            await supabase.storage.from('photos').remove(supaPaths);
          }

          // 3. Delete DB rows
          const { error: dbErr } = await supabase
            .from('photos')
            .delete()
            .eq('event_id', id);

          if (dbErr) throw dbErr;

          setSignedUrls({});
          showToast('success', 'Cleared', `All photos have been successfully deleted.`);
          await fetchEvent(); // refresh
        } catch (err) {
          showToast('error', 'Clear Failed', err.message);
        } finally {
          setActionLoading({ loading: false, message: '' });
        }
      }
    );
  };

  const handleDownloadSelected = async () => {
    const selectedPhotos = photos.filter(p => selectedIds.has(p.id));
    
    showToast('success', 'Downloading...', `Starting download for ${selectedPhotos.length} photos.`);
    
    for (const photo of selectedPhotos) {
      try {
        // Use signed URL for iDrive photos, supabase_url for legacy photos
        const fetchUrl = getPhotoUrl(photo);
        if (!fetchUrl) continue;
        const response = await fetch(fetchUrl);
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

        {/* Back button */}
        <button
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-teal-700 mb-5 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Event
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-6 w-full overflow-hidden">
          <button onClick={() => navigate('/studio')} className="hover:text-teal-700 hover:underline transition-colors shrink-0">Dashboard</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <button onClick={() => navigate('/events')} className="hover:text-teal-700 hover:underline transition-colors shrink-0">Events</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <button onClick={() => navigate(`/events/${id}`)} className="hover:text-teal-700 hover:underline transition-colors truncate max-w-[150px]">{event.name}</button>
          <span className="text-zinc-300 shrink-0">/</span>
          <span className="text-zinc-900 font-bold shrink-0">Photo Selection</span>
        </nav>

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

            {/* Photo count badge */}
            <div className="flex gap-3 items-stretch">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 shadow-sm flex flex-col justify-center min-w-[130px]">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Images size={14} className="text-teal-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Photos</p>
                </div>
                <p className="text-2xl font-black text-zinc-900">{photos.length.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">in this event</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 shadow-sm flex flex-col justify-center min-w-[140px]">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-400">
                  <Images size={14} className={quotaFull ? 'text-red-500' : quotaWarning ? 'text-amber-500' : 'text-violet-500'} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Global Storage</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className={`text-2xl font-black ${quotaFull ? 'text-red-600' : 'text-zinc-900'}`}>{formatBytes(storageUsed)}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">/ 10 GB</p>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">across all events</p>
              </div>
            </div>
          </div>
        </div>

        {/* Photo quota banners */}
        {quotaFull && (
          <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6">
            <p className="text-sm font-bold text-red-700">📛 Global storage limit reached — {formatBytes(storageUsed)} / 10 GB used. Please delete some photos to upload more.</p>
          </div>
        )}
        {quotaWarning && !quotaFull && (
          <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 mb-6">
            <p className="text-sm font-bold text-amber-700">⚠️ Approaching storage limit — {formatBytes(storageUsed)} of 10 GB used</p>
          </div>
        )}

        {/* Live Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${event.is_public ? 'bg-green-50 border border-green-100' : 'bg-zinc-50 border border-zinc-100'}`}>
          <div className={`w-3 h-3 rounded-full shrink-0 ${event.is_public ? 'bg-green-500 animate-pulse' : 'bg-zinc-300'}`} />
          <div>
            <p className={`text-sm font-bold ${event.is_public ? 'text-green-700' : 'text-zinc-500'}`}>
              {event.is_public ? 'Photo Selection is LIVE' : 'Photo Selection is OFFLINE'}
            </p>
            <p className="text-[10px] text-zinc-400">
              {event.is_public ? 'Guests can access via the guest link' : 'Toggle Guest Link on to make it accessible'}
            </p>
          </div>
        </div>

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
                disabled={actionLoading.loading || tempPassword === (event.password || '')}
                className="px-6 py-2.5 rounded-xl silk-gradient text-white text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-teal-500/10"
              >
                {actionLoading.loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
              </button>
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
              <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="silk-gradient text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Upload size={14} /> Select Photos
                </button>
                <button
                  type="button"
                  onClick={handleFolderPick}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-teal-200 text-teal-700 bg-white hover:border-teal-400 active:scale-95 transition-all flex items-center gap-2 max-w-[180px]"
                >
                  <FolderOpen size={14} className="shrink-0" />
                  <span className="truncate">{selectedFolderName ?? 'Select Folder'}</span>
                </button>
              </div>
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
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7 mb-6 animate-in fade-in duration-300 border border-teal-100">

            {/* Phase tabs */}
            <div className="flex items-center gap-2 mb-5">
              {[
                { key: 'compressing', label: 'Compressing', color: 'amber' },
                { key: 'uploading',   label: 'Uploading',   color: 'teal'  },
              ].map(({ key, label, color }) => {
                const isActive = uploadState.phase === key;
                const isDone   = key === 'compressing' && uploadState.phase === 'uploading';
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    isActive
                      ? color === 'amber'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-teal-50 border-teal-200 text-teal-700'
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
              {uploadState.phase === 'compressing' ? 'Compressing' : 'Uploading'}:{' '}
              <span className="text-zinc-600 font-medium">{uploadState.message}</span>
            </p>

            {/* Progress bar */}
            <div className="relative h-3 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200/60">
              <div
                className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-300 ${
                  uploadState.phase === 'compressing'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'silk-gradient'
                }`}
                style={{ width: `${uploadState.percent}%` }}
              />
            </div>

            {/* Counter + percent */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-zinc-400">
                {uploadState.current} <span className="text-zinc-300">/ {uploadState.total}</span> photos
              </p>
              <p className={`text-sm font-black ${uploadState.phase === 'compressing' ? 'text-amber-500' : 'text-teal-600'}`}>
                {uploadState.percent}%
              </p>
            </div>
          </div>
        )}

        {/* Staged Files */}
        {uploadState.phase === 'idle' && stagedFiles.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-6 mb-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black">{stagedFiles.length}</span>
                  Photos Ready to Upload
                  {storageUsed + stagedFiles.reduce((acc, f) => acc + f.file.size, 0) > GLOBAL_STORAGE_LIMIT && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-black animate-in fade-in duration-200">
                      <X size={10} strokeWidth={3} />
                      Over Limit
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Images will be auto-compressed before upload.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setStagedFiles([]); setSelectedFolderName(null); }} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-red-500 hover:bg-zinc-50 rounded-xl transition-all">
                  Clear All
                </button>
                <button onClick={startUpload} className="flex items-center gap-2 px-6 py-2 rounded-xl silk-gradient text-white shadow-md text-sm font-bold active:scale-95 transition-all">
                  <CloudUpload size={16} /> Upload Now
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {stagedFiles.map(staged => (
                <div key={staged.id} className="relative aspect-square rounded-xl bg-zinc-100 overflow-hidden group">
                  <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeStagedFile(staged.id); }}
                      className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
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

        {/* Guest Submissions */}
        {guestSubmissions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                <Users size={16} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">Guest Submissions</h2>
              <span className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-violet-100 text-violet-600">{guestSubmissions.length}</span>
            </div>
            <div className="space-y-3">
              {guestSubmissions.map(sub => (
                <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <p className="font-bold text-zinc-900">{sub.guest_name || 'Anonymous Guest'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Heart size={11} className="text-pink-400" fill="currentColor" />
                        {sub.photo_count} photo{sub.photo_count !== 1 ? 's' : ''} selected
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(sub.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {sub.is_locked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-widest">
                        <Lock size={10} /> Locked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full uppercase tracking-widest">
                        Re-selection Open
                      </span>
                    )}
                    {sub.is_locked && (
                      <button
                        onClick={() => handleUnlockGuest(sub.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all active:scale-95"
                      >
                        <RotateCcw size={13} /> Allow Re-selection
                      </button>
                    )}
                  </div>
                </div>
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
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-1.5 ${activeTab === 'comments' ? 'text-amber-500' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Comments
              <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${activeTab === 'comments' ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-400'}`}>
                {Object.keys(photoComments).length}
              </div>
              {activeTab === 'comments' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />}
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                {activeTab === 'all' ? 'Event Gallery' : 'Guest Favorites'}
              </h2>
              {showGallery && photos.length > 0 && (
                <button 
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-teal-600 transition-colors"
                >
                  {photos.filter(p => activeTab === 'all' || (p.likes_count || 0) > 0).every(p => selectedIds.has(p.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                  {photos.filter(p => activeTab === 'all' || (p.likes_count || 0) > 0).every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            
            {/* Selection Actions Bar — shown when items are selected */}
            {showGallery && selectedIds.size > 0 && (
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
                    disabled={actionLoading.loading}
                    className="p-2 rounded-lg bg-zinc-50 text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm disabled:opacity-50"
                    title="Delete Selected"
                  >
                    {actionLoading.loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </div>
            )}

            {/* Clear All Photos — shown only when gallery is visible, photos exist and nothing is selected */}
            {showGallery && photos.length > 0 && selectedIds.size === 0 && (
              <button
                onClick={handleClearAllPhotos}
                disabled={!!actionLoading.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete all photos from this event and storage"
              >
                {actionLoading.loading
                  ? <><Loader2 size={13} className="animate-spin" /> Clearing…</>
                  : <><Trash2 size={13} /> Clear All Photos</>
                }
              </button>
            )}
          </div>

          {!showGallery ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 rounded-xl border border-zinc-100">
              <Images size={40} className="text-teal-200 mb-4" />
              <p className="text-zinc-600 font-medium mb-1">Gallery preview hidden</p>
              <p className="text-xs text-zinc-400 mb-6 max-w-sm text-center">Click below to load and view uploaded photos.</p>
              <button onClick={() => setShowGallery(true)} className="px-6 py-2.5 rounded-xl silk-gradient text-white font-bold text-sm hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center gap-2">
                <Eye size={16} /> View Photos
              </button>
            </div>
          ) : activeTab === 'comments' ? (
            (() => {
              const commented = photos
                .filter(p => (photoComments[p.id]?.length || 0) > 0)
                .sort((a, b) => {
                  const aLatest = photoComments[a.id]?.at(-1)?.created_at ?? '';
                  const bLatest = photoComments[b.id]?.at(-1)?.created_at ?? '';
                  return bLatest.localeCompare(aLatest);
                });
              return commented.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <MessageCircle size={40} className="mb-3 opacity-30" />
                  <p className="font-medium">No comments yet</p>
                  <p className="text-sm mt-1">Guests can leave feedback on photos from the guest view</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {commented.map((photo, commentIdx) => (
                    <div key={photo.id} className="rounded-2xl border border-zinc-100 overflow-hidden">
                      {/* Photo header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                        <div className="w-6 h-6 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-zinc-500">{commentIdx + 1}</span>
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-zinc-200">
                          {getPhotoUrl(photo)
                            ? <img src={getPhotoUrl(photo)} alt={photo.file_name} className="w-full h-full object-cover" />
                            : <ImageIcon className="w-full h-full p-2 text-zinc-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-700 truncate">{photo.file_name}</p>
                          <p className="text-[10px] text-zinc-400">{photoComments[photo.id].length} message{photoComments[photo.id].length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                          onClick={() => { setReplacingPhotoId(photo.id); replaceInputRef.current?.click(); }}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all active:scale-95"
                        >
                          <Upload size={12} /> Replace Photo
                        </button>
                      </div>

                      {/* Thread messages */}
                      <div className="p-4 space-y-3 max-h-64 overflow-y-auto bg-white">
                        {photoComments[photo.id].map(msg => {
                          const isMe = msg.sender_type === 'photographer';
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-snug ${isMe ? 'bg-teal-500 text-white rounded-br-sm' : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'}`}>
                                <p className={`text-[10px] font-bold mb-0.5 ${isMe ? 'text-teal-100' : 'text-zinc-400'}`}>
                                  {isMe ? 'You (Photographer)' : (msg.sender_name || 'Guest')}
                                </p>
                                <p>{msg.message}</p>
                                <p className={`text-[9px] mt-1 ${isMe ? 'text-teal-100' : 'text-zinc-400'}`}>
                                  {new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  {' · '}
                                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reply box */}
                      <div className="px-4 py-3 border-t border-zinc-100 bg-white flex gap-2">
                        <input
                          value={replyDraft[photo.id] || ''}
                          onChange={e => setReplyDraft(prev => ({ ...prev, [photo.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePhotographerReply(photo.id); } }}
                          placeholder="Reply to guest..."
                          className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 transition-colors"
                        />
                        <button
                          onClick={() => handlePhotographerReply(photo.id)}
                          disabled={sendingReply === photo.id || !(replyDraft[photo.id] || '').trim()}
                          className="px-4 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold disabled:opacity-40 hover:bg-teal-600 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                          {sendingReply === photo.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <><Send size={13} /> Reply</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <ImageIcon size={40} className="mb-3 opacity-30" />
              <p className="font-medium">No photos yet</p>
              <p className="text-sm mt-1">Upload photos using the zone above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos
                .filter(photo => activeTab === 'all' || (photo.likes_count || 0) > 0)
                .map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`group relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${selectedIds.has(photo.id) ? 'ring-4 ring-teal-500/20' : 'bg-zinc-100'}`}
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

                  {/* Number badge — only in Guest Selections tab */}
                  {activeTab === 'selected' && (
                    <div className="absolute bottom-2 left-2 z-10 w-6 h-6 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-[10px] font-black text-white leading-none">{idx + 1}</span>
                    </div>
                  )}

                  {/* Pencil replace button — All tab only, top-left, shows on hover */}
                  {activeTab === 'all' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setReplacingPhotoId(photo.id); replaceInputRef.current?.click(); }}
                      className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-teal-500 active:scale-95"
                      title="Replace photo"
                    >
                      <Pencil size={12} />
                    </button>
                  )}

                  {/* Heart Badge */}
                  {(photo.likes_count || 0) > 0 && (
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-1 rounded-lg bg-white/90 backdrop-blur-md shadow-sm border border-pink-100 flex items-center gap-1 animate-in zoom-in duration-300">
                      <Heart size={10} className="text-pink-500" fill="currentColor" />
                      <span className="text-[10px] font-black text-pink-600">{photo.likes_count}</span>
                    </div>
                  )}
                  {/* Comment Badge */}
                  {(photoComments[photo.id]?.length || 0) > 0 && (
                    <div className="absolute top-2 right-2 z-10 px-1.5 py-1 rounded-lg bg-white/90 backdrop-blur-md shadow-sm border border-amber-100 flex items-center gap-1 animate-in zoom-in duration-300">
                      <MessageCircle size={10} className="text-amber-500" fill="currentColor" />
                      <span className="text-[10px] font-black text-amber-600">{photoComments[photo.id].length}</span>
                    </div>
                  )}

                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                    className={`absolute inset-0 transition-opacity duration-200 cursor-pointer ${selectedIds.has(photo.id) ? 'bg-teal-500/20 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}
                  >
                    {/* Checkbox Trigger Area */}
                    <div className="absolute bottom-3 right-3">
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

      {/* Hidden input for replacing a single photo — outside all click zones */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplacePhoto}
      />

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Quota Exceeded Modal */}
      {quotaModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuotaModal(m => ({ ...m, show: false }))} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={24} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-black text-zinc-900 text-center mb-3">Storage Limit Exceeded</h2>
            <p className="text-sm text-zinc-500 text-center mb-1">
              You are trying to upload <span className="font-bold text-teal-600">{formatBytes(quotaModal.trying)}</span> but you only have <span className="font-bold text-teal-600">{formatBytes(Math.max(0, GLOBAL_STORAGE_LIMIT - quotaModal.currentUsed))}</span> remaining.
            </p>
            <p className="text-sm text-zinc-500 text-center mb-6">
              Please remove some photos from the staging area and try again.
            </p>
            <button
              onClick={() => setQuotaModal(m => ({ ...m, show: false }))}
              className="w-full py-3 rounded-xl silk-gradient text-white font-bold text-sm transition-all active:scale-95"
            >
              OK, I'll remove some
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action || (() => {})}
        onCancel={closeConfirm}
        confirmText="Delete"
      />

      {actionLoading.loading && <ActionOverlay message={actionLoading.message} />}
    </DashboardLayout>
  );
}
