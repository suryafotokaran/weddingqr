import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import {
  Upload, X, CheckCircle, AlertCircle, Loader2, ImageIcon,
  CalendarDays, Tag, Images, ArrowLeft, CloudUpload,
} from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatGb(bytes) {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function UploadItem({ item }) {
  const statusIcon = {
    pending:    <Loader2 size={16} className="text-zinc-400 animate-spin" />,
    uploading:  <Loader2 size={16} className="text-teal-500 animate-spin" />,
    done:       <CheckCircle size={16} className="text-teal-600" />,
    error:      <AlertCircle size={16} className="text-red-500" />,
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
  const fileInputRef                = useRef(null);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchEvent = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  // Signed URLs for photo grid
  const [photoUrls, setPhotoUrls] = useState({});
  useEffect(() => {
    if (!photos.length) return;
    (async () => {
      const entries = await Promise.all(
        photos.map(async (p) => {
          const { data } = await supabase.storage
            .from('event-photos')
            .createSignedUrl(p.storage_path, 3600);
          return [p.id, data?.signedUrl ?? null];
        }),
      );
      setPhotoUrls(Object.fromEntries(entries));
    })();
  }, [photos]);

  const uploadFiles = useCallback(async (files) => {
    if (!user || !event) return;
    const validFiles = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        showToast('error', 'File too large', `"${f.name}" exceeds 50 MB limit.`);
        continue;
      }
      if (!f.type.startsWith('image/')) {
        showToast('error', 'Invalid file', `"${f.name}" is not an image.`);
        continue;
      }
      const totalPhotos = photos.length + validFiles.length;
      if (totalPhotos >= event.photos_limit) {
        showToast('error', 'Quota reached', `This event allows max ${event.photos_limit} photos.`);
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

      const ext       = item.file.name.split('.').pop();
      const fileName  = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storagePath = `${user.id}/${event.id}/${fileName}`;

      const { error: storageErr } = await supabase.storage
        .from('event-photos')
        .upload(storagePath, item.file, { upsert: false });

      if (storageErr) {
        setUploading(prev =>
          prev.map(u => u.id === item.id ? { ...u, status: 'error', error: storageErr.message } : u),
        );
        continue;
      }

      const { error: dbErr } = await supabase.from('photos').insert({
        event_id:     event.id,
        user_id:      user.id,
        storage_path: storagePath,
        file_name:    item.file.name,
        size_bytes:   item.file.size,
      });

      if (dbErr) {
        setUploading(prev =>
          prev.map(u => u.id === item.id ? { ...u, status: 'error', error: dbErr.message } : u),
        );
        continue;
      }

      setUploading(prev => prev.map(u => u.id === item.id ? { ...u, status: 'done', progress: 100 } : u));
    }

    // Refresh photo list
    await fetchEvent();
    // Remove done items after a delay
    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.status !== 'done'));
    }, 3000);
  }, [user, event, photos.length, fetchEvent]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }, [uploadFiles]);

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()    => setIsDragging(false);
  const handleFilePick  = (e)   => uploadFiles(Array.from(e.target.files));

  const photoPercent = event ? Math.min(100, (photos.length / event.photos_limit) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="animate-spin text-teal-600" size={32} />
        </div>
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

            <div className="flex gap-3">
              {/* Photo quota */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 min-w-[130px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Images size={14} className="text-teal-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Photos</p>
                </div>
                <p className="text-lg font-bold text-zinc-900">{photos.length} <span className="text-sm font-medium text-zinc-400">/ {event.photos_limit}</span></p>
                <div className="mt-1.5 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${photoPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-6 ${
            isDragging
              ? 'border-teal-500 bg-teal-50 scale-[1.01]'
              : 'border-zinc-200 bg-white hover:border-teal-400 hover:bg-teal-50/30'
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'silk-gradient' : 'bg-zinc-100'}`}>
              <CloudUpload size={28} className={isDragging ? 'text-white' : 'text-zinc-400'} />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-800">
                {isDragging ? 'Drop photos here' : 'Drag & drop photos here'}
              </p>
              <p className="text-sm text-zinc-500 mt-1">or click to browse · Max 50 MB per photo · JPG, PNG, WEBP, HEIC</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="silk-gradient text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
            >
              <Upload size={14} className="inline mr-1.5" />
              Select Photos
            </button>
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
              <h3 className="font-bold text-zinc-900">Uploading</h3>
              <button
                onClick={() => setUploading([])}
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

        {/* Photo Grid */}
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Photos <span className="text-zinc-400 font-medium text-base ml-1">({photos.length})</span>
            </h2>
          </div>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <ImageIcon size={40} className="mb-3 opacity-30" />
              <p className="font-medium">No photos yet</p>
              <p className="text-sm mt-1">Upload photos using the zone above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {photoUrls[photo.id] ? (
                    <img
                      src={photoUrls[photo.id]}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Loader2 size={20} className="animate-spin text-zinc-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
    </DashboardLayout>
  );
}
