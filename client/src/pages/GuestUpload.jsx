import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadToR2, buildR2RefUrl } from '../lib/s3';
import {
  Upload, X, CheckCircle, AlertCircle, Loader2, ImageIcon,
  Camera, Images, QrCode, Tag, CalendarDays
} from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function UploadItem({ item }) {
  const statusIcon = {
    pending:   <Loader2 size={16} className="text-zinc-400 animate-spin" />,
    uploading: <Loader2 size={16} className="text-violet-500 animate-spin" />,
    done:      <CheckCircle size={16} className="text-green-500" />,
    error:     <AlertCircle size={16} className="text-red-400" />,
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/80 backdrop-blur-sm">
      <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
        {item.previewUrl
          ? <img src={item.previewUrl} className="w-full h-full object-cover" alt="" />
          : <ImageIcon size={18} className="text-zinc-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 truncate">{item.file.name}</p>
        <p className="text-xs text-zinc-400">{formatBytes(item.file.size)}</p>
        {item.status === 'uploading' && (
          <div className="mt-1.5 h-1 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${item.progress ?? 50}%` }}
            />
          </div>
        )}
        {item.error && <p className="text-xs text-red-400 mt-0.5">{item.error}</p>}
      </div>
      {statusIcon[item.status]}
    </div>
  );
}

export default function GuestUpload() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Fetch event ── */
  useEffect(() => {
    const fetchEvent = async () => {
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .select('id, name, type, date, max_image_size_mb, storage_gb, is_public')
        .eq('id', id)
        .single();

      if (evErr || !ev) {
        setError('Event not found or link is invalid.');
      } else if (!ev.is_public) {
        setError('This event is currently private. Please contact the host.');
      } else {
        setEvent(ev);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id]);

  /* ── Upload handler ── */
  const uploadFiles = useCallback(async (files) => {
    if (!event) return;

    const maxMb = event.max_image_size_mb || 50;
    const maxBytes = maxMb * 1024 * 1024;

    const validFiles = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > maxBytes) continue;
      validFiles.push(f);
    }
    if (!validFiles.length) return;

    const newItems = validFiles.map(f => ({
      id:         Math.random().toString(36).slice(2),
      file:       f,
      status:     'pending',
      progress:   0,
      error:      null,
      previewUrl: URL.createObjectURL(f),
    }));

    setUploading(prev => [...newItems, ...prev]);

    for (const item of newItems) {
      setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading', progress: 10 } : u));

      try {
        const ext = item.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const folderName = event?.name ? event.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : event.id;
        const storagePath = `${folderName}_guestupload/${fileName}`;

        await uploadToR2(item.file, storagePath);

        const refUrl = buildR2RefUrl(storagePath);

        const { error: dbErr } = await supabase.from('photos').insert({
          event_id:     event.id,
          user_id:      null,                // null = guest upload
          storage_path: storagePath,
          file_name:    item.file.name,
          size_bytes:   item.file.size,
          supabase_url: refUrl,
          source:       'guest',             // marks this as a guest/QR upload
        });

        if (dbErr) throw new Error(dbErr.message);

        setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'done', progress: 100 } : u));
        setDoneCount(n => n + 1);
      } catch (err) {
        setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', error: err.message } : u));
      }
    }

    // Auto-clear done items after 4s
    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.status !== 'done'));
    }, 4000);
  }, [event]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }, [uploadFiles]);

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()  => setIsDragging(false);
  const handleFilePick  = (e) => uploadFiles(Array.from(e.target.files));

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #faf5ff 100%)' }}>
        <Loader2 className="animate-spin text-violet-500" size={32} />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #faf5ff 100%)' }}>
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-5 text-red-400">
            <QrCode size={28} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">Oops!</h2>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  const activeUploads = uploading.filter(u => u.status === 'uploading').length;
  const hasItems = uploading.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #faf5ff 100%)' }}
    >
      {event?.theme_color && (
        <style dangerouslySetInnerHTML={{ __html: `
          .text-violet-500, .text-violet-600, .text-violet-700 { color: ${event.theme_color} !important; }
          .bg-violet-50 { background-color: ${event.theme_color}20 !important; }
          .bg-violet-100 { background-color: ${event.theme_color}33 !important; }
          .bg-violet-500, .bg-violet-600, .bg-violet-700 { background-color: ${event.theme_color} !important; }
          .border-violet-200, .border-violet-400, .border-violet-500 { border-color: ${event.theme_color}80 !important; }
          .shadow-violet-500\\/10, .shadow-violet-500\\/25, .shadow-violet-500\\/30 { --tw-shadow-color: ${event.theme_color}4d !important; }
          .bg-gradient-to-br { background: linear-gradient(to bottom right, ${event.theme_color}, ${event.theme_color}dd) !important; }
        `}} />
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/60 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/25">
              <QrCode size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Guest Upload</p>
              <p className="text-sm font-black text-zinc-900 leading-tight">{event.name}</p>
            </div>
          </div>

          {doneCount > 0 && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <CheckCircle size={13} className="text-green-500" />
              <span className="text-xs font-bold text-green-700">{doneCount} uploaded</span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-5">

          {/* Event Info Card */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Event</p>
            <h1 className="text-lg font-extrabold text-zinc-900">{event.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
              <span className="flex items-center gap-1"><Tag size={11} />{event.type}</span>
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-violet-500 bg-violet-50 scale-[1.02]'
                : 'border-violet-200 bg-white/60 hover:border-violet-400 hover:bg-white/80 hover:shadow-lg hover:shadow-violet-500/10'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${
                  isDragging
                    ? 'bg-violet-500 shadow-lg shadow-violet-500/30 scale-110'
                    : 'bg-gradient-to-br from-violet-100 to-violet-50'
                }`}
              >
                {activeUploads > 0
                  ? <Loader2 size={32} className="text-violet-600 animate-spin" />
                  : <Camera size={32} className={isDragging ? 'text-white' : 'text-violet-500'} />
                }
              </div>

              <div>
                <p className="text-lg font-extrabold text-zinc-800">
                  {activeUploads > 0
                    ? `Uploading ${activeUploads} photo${activeUploads > 1 ? 's' : ''}…`
                    : isDragging
                    ? 'Drop your photos here!'
                    : 'Share your photos'}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Tap to pick photos · Supports JPG, PNG, HEIC, WEBP
                </p>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  Max {event.max_image_size_mb || 50} MB per photo
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg shadow-violet-500/25 transition-all active:scale-95 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                <Upload size={16} />
                Choose Photos
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFilePick}
              capture="environment"
            />
          </div>

          {/* Upload Queue */}
          {hasItems && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                  <Images size={16} className="text-violet-500" />
                  Your Uploads
                </h3>
                <button
                  onClick={() => setUploading(prev => prev.filter(u => u.status !== 'done'))}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
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

          {/* Success Banner */}
          {doneCount > 0 && uploading.every(u => u.status !== 'uploading') && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center animate-in fade-in zoom-in-95 duration-300">
              <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-800">
                {doneCount === 1 ? '1 photo shared!' : `${doneCount} photos shared!`}
              </p>
              <p className="text-xs text-green-600 mt-1">
                They're now live in the event gallery. Thank you! 🎉
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-5 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-all active:scale-95"
              >
                Upload More Photos
              </button>
            </div>
          )}

          {/* Tips */}
          {!hasItems && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '📸', label: 'Camera Roll', hint: 'Pick from your gallery' },
                { emoji: '⚡', label: 'Instant', hint: 'Uploads in seconds' },
                { emoji: '🎉', label: 'Live Gallery', hint: 'Visible to everyone' },
              ].map(({ emoji, label, hint }) => (
                <div key={label} className="bg-white/50 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/70">
                  <p className="text-2xl mb-1">{emoji}</p>
                  <p className="text-xs font-bold text-zinc-700">{label}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{hint}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Powered by WeddingQR</p>
      </footer>
    </div>
  );
}
