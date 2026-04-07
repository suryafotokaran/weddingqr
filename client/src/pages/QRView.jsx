import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSignedPhotoUrls } from '../lib/s3';
import {
  Images, CalendarDays, Tag, Loader2, Download, Check,
  Square, CheckSquare, QrCode, EyeOff, X
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function QRView() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Screen protection
  useEffect(() => {
    if (!event?.allow_screenshot) return;

    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // Block Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('Printing is disabled for this event.');
      }
      // Block Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [event?.allow_screenshot]);

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
  useEffect(() => {
    const fetchData = async () => {
      // Fetch event
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .select('id, name, type, date, is_qr_live, allow_download, allow_screenshot')
        .eq('id', id)
        .single();

      if (evErr || !ev) {
        setError('Gallery not found or link is invalid.');
        setLoading(false);
        return;
      }

      // Check if QR gallery is live
      if (!ev.is_qr_live) {
        setError('This gallery is currently not available. Please contact the host.');
        setLoading(false);
        return;
      }

      setEvent(ev);

      // Fetch QR gallery photos
      const { data: qrPhotos } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', id)
        .eq('source', 'qr_gallery')
        .order('created_at', { ascending: false });

      setPhotos(qrPhotos ?? []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

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

  /* ── Download selected photos ── */
  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return;

    setDownloading(true);
    const selectedPhotos = photos.filter(p => selectedIds.has(p.id));

    for (const photo of selectedPhotos) {
      try {
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
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('Download failed for', photo.file_name, err);
      }
    }

    setDownloading(false);
  };

  /* ── Download single photo ── */
  const handleDownloadSingle = async (photo) => {
    try {
      const fetchUrl = getPhotoUrl(photo);
      if (!fetchUrl) return;

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
    } catch (err) {
      console.error('Download failed', err);
    }
  };

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
          <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center mx-auto mb-5 text-zinc-400">
            <EyeOff size={28} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">Gallery Unavailable</h2>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #faf5ff 100%)' }}
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/60 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/25">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Photo Gallery</p>
              <p className="text-base font-black text-zinc-900 leading-tight">{event.name}</p>
            </div>
          </div>

          {/* Photo count */}
          <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-2">
            <Images size={14} className="text-violet-500" />
            <span className="text-xs font-bold text-violet-700">{photos.length} photos</span>
          </div>
        </div>
      </header>

      {/* Event Info */}
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm px-5 py-4">
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Tag size={12} />{event.type}</span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={12} />
                {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Bar */}
      {photos.length > 0 && event?.allow_download && (
        <div className="px-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm px-5 py-3 flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-violet-600 transition-colors"
              >
                {photos.every(p => selectedIds.has(p.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                {photos.every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
              </button>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                  <span className="text-xs font-bold text-violet-600">{selectedIds.size} selected</span>
                  <button
                    onClick={handleDownloadSelected}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-all active:scale-95 shadow-lg shadow-violet-500/20 disabled:opacity-50"
                  >
                    {downloading ? (
                      <><Loader2 size={14} className="animate-spin" /> Downloading...</>
                    ) : (
                      <><Download size={14} /> Download Selected</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <main className="flex-1 px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          {photos.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <Images size={28} />
              </div>
              <p className="font-bold text-zinc-500">No photos yet</p>
              <p className="text-sm text-zinc-400 mt-1">Check back later for photos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className={`group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 bg-white/50 ${selectedIds.has(photo.id) ? 'ring-4 ring-violet-500/30 scale-[0.98]' : ''}`}
                >
                  {getPhotoUrl(photo) ? (
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                      loading="lazy"
                      onClick={() => setLightboxPhoto(photo)}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-zinc-100">
                      <Loader2 size={20} className="animate-spin text-zinc-300" />
                    </div>
                  )}

                  {/* Selection overlay */}
                  {event?.allow_download && (
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                      className={`absolute inset-0 transition-opacity duration-200 cursor-pointer ${selectedIds.has(photo.id) ? 'bg-violet-500/20 opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}
                    >
                      {/* Checkbox */}
                      <div className="absolute top-3 left-3">
                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'bg-violet-500 border-violet-500 text-white' : 'bg-white/80 border-white/60 backdrop-blur-sm'}`}>
                          {selectedIds.has(photo.id) && <Check size={16} />}
                        </div>
                      </div>

                      {/* Download button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadSingle(photo); }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center text-zinc-600 hover:bg-white hover:text-violet-600 transition-all"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  )}

                  {/* File info on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <p className="text-white text-xs font-medium truncate">{photo.file_name}</p>
                    <p className="text-white/60 text-[10px]">{formatBytes(photo.size_bytes)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <X size={20} />
          </button>

          {event?.allow_download && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadSingle(lightboxPhoto); }}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium hover:bg-white/20 transition-all"
            >
              <Download size={16} /> Download
            </button>
          )}

          <img
            src={getPhotoUrl(lightboxPhoto)}
            alt={lightboxPhoto.file_name}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <p className="text-white text-sm font-medium">{lightboxPhoto.file_name}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Powered by WeddingQR</p>
      </footer>

      {event?.allow_screenshot && (
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          img {
            pointer-events: none;
            -webkit-user-drag: none;
          }
          @media print {
            body { display: none !important; }
          }
        `}} />
      )}
    </div>
  );
}
