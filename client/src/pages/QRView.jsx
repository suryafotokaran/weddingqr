import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSignedPhotoUrls } from '../lib/s3';
import {
  Images, CalendarDays, Tag, Loader2, Download, Check,
  Square, CheckSquare, QrCode, EyeOff, X, Camera, User, ShieldCheck
} from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { loadModels, extractSingleEmbedding } from '../lib/faceApi';

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
  const [viewState, setViewState] = useState('initial');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!event?.allow_screenshot) return;

    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert('Printing is disabled for this event.');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
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

  useEffect(() => {
    if (!photos.length) return;
    getSignedPhotoUrls(photos).then(urls => {
      if (Object.keys(urls).length) setSignedUrls(prev => ({ ...prev, ...urls }));
    });
  }, [photos]);

  const getPhotoUrl = useCallback((photo) => {
    return signedUrls[photo.id] || photo.supabase_url || null;
  }, [signedUrls]);

  /* ── Fetch event & Load Models ── */
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const { data, error } = await supabase
            .from('events')
            .select('id, name, type, date, is_qr_live, allow_download, allow_screenshot, theme_color')
            .eq('id', id)
            .single();

        if (!active) return;

        if (error || !data) {
          setError('Gallery not found or link is invalid.');
          return;
        }

        if (!data.is_qr_live) {
          setError('This gallery is currently not available. Please contact the host.');
          return;
        }

        // Event is valid and live, load models concurrently and silently
        loadModels().catch(err => console.error("FaceAPI models failed to load", err));

        setEvent(data);
        setViewState('landing');
      } catch (err) {
        console.error(err);
        if (active) setError('Failed to initialize matching camera.');
      }
    };
    init();
    return () => { active = false; };
  }, [id]);

  /* ── Camera Management ── */
  useEffect(() => {
    if (viewState === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [viewState]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setError('Camera permission is required to find your photos.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const retryCamera = () => {
    setError(null);
    setViewState('camera');
  };

  /* ── Capture & Process Selfie ── */
  const handleCapture = async () => {
    if (!videoRef.current) return;
    setViewState('processing');

    try {
      const descriptor = await extractSingleEmbedding(videoRef.current);

      if (!descriptor) {
        setError('No face detected. Please make sure your face is visible and in good lighting.');
        return;
      }

      const embeddingArray = Array.from(descriptor);

      const { data: matchedPhotos, error: rpcErr } = await supabase.rpc('match_faces', {
        query_embedding: `[${embeddingArray.join(',')}]`,
        match_threshold: 0.5,
        match_count: 50,
        p_event_id: id
      });

      if (rpcErr) throw rpcErr;

      if (!matchedPhotos || matchedPhotos.length === 0) {
        setPhotos([]);
        setViewState('gallery');
        return;
      }

      const matchedIds = matchedPhotos.map(m => m.photo_id);
      const { data: fullPhotos, error: fetchErr } = await supabase
        .from('photos')
        .select('*')
        .in('id', matchedIds);

      if (fetchErr) throw fetchErr;

      const sortedPhotos = matchedPhotos
        .map(m => fullPhotos.find(p => p.id === m.photo_id))
        .filter(Boolean);

      setPhotos(sortedPhotos);
      setViewState('gallery');
      stopCamera();

    } catch (err) {
      console.error('Face processing error:', err);
      setError('Error processing photo or finding matches. Please try again.');
    }
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
    const allSelected = photos.length > 0 && photos.every(p => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  /* ── Download handlers ── */
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

        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('Download failed for', photo.file_name, err);
      }
    }

    setDownloading(false);
  };

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

  /* ── Render States ── */

  if (viewState === 'landing' && event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fdfcff]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-violet-100/50 blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[120px]" />
        </div>

        <div className="relative max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-[2.5rem] bg-white shadow-2xl shadow-violet-200/50 flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-700">
             <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
               <Tag size={24} />
             </div>
          </div>

          <div className="space-y-2 mb-10 animate-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 leading-tight">
              {event.name}
            </h1>
            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <button
            onClick={() => setViewState('camera')}
            className="group relative w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-zinc-900 text-white text-lg font-bold shadow-2xl shadow-zinc-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-2">
              <Camera size={22} /> Find My Photos
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #faf5ff 100%)' }}>
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center mx-auto mb-5 text-zinc-400">
            <EyeOff size={28} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">Oops!</h2>
          <p className="text-sm text-zinc-500 mb-6">{error}</p>
          {event && (
            <>
              <button
                onClick={retryCamera}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition"
              >
                Try Again
              </button>

            </>
          )}
        </div>
      </div>
    );
  }

  if (viewState === 'initial' || viewState === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcff] p-6">
        <div className="relative">
           <div className="absolute inset-0 bg-violet-500 blur-2xl opacity-20 animate-pulse" />
           <div className="relative bg-white rounded-3xl p-10 shadow-xl border border-zinc-50 flex flex-col items-center">
             <Loader2 className="animate-spin text-violet-600 mb-6" size={48} strokeWidth={3} />
             <h2 className="text-2xl font-black text-zinc-900 mb-2">
               {viewState === 'initial' ? 'Waking up...' : 'Magic in progress...'}
             </h2>
             <p className="text-sm text-zinc-400 font-medium text-center max-w-[240px] leading-relaxed">
               {viewState === 'initial' ? 'Preparing your personalized gallery.' : 'Matching your face with event photos securely.'}
             </p>
             
             {viewState === 'processing' && (
               <div className="mt-8 px-4 py-2 bg-green-50 rounded-full flex items-center gap-2">
                 <ShieldCheck size={14} className="text-green-500" />
                 <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Processing On-Device</span>
               </div>
             )}
           </div>
        </div>
      </div>
    );
  }

  if (viewState === 'camera') {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfcff]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-violet-100/50 blur-[120px]" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header Area */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4 text-violet-600">
                <User size={24} />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 mb-2">Take a Selfie</h2>
              <p className="text-sm text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                We'll use this to find your photos from <b>{event?.name}</b>.
              </p>
            </div>

            {/* Camera Preview Area */}
            <div className="relative aspect-[3/4] bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-violet-200/50 border-[6px] border-white">
              {!streamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <Loader2 className="animate-spin text-white/20" size={40} />
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              
              {/* Modern Scan Guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-64 h-80 border-2 border-dashed border-white/40 rounded-[3rem] relative">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-violet-500 rounded-tl-2xl" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-violet-500 rounded-tr-2xl" />
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-violet-500 rounded-bl-2xl" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-violet-500 rounded-br-2xl" />
                 </div>
              </div>

              {/* Glass Privacy Badge */}
              <div className="absolute top-6 left-6 right-6">
                 <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center">
                       <ShieldCheck size={14} className="text-white" />
                    </div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-wider">Secure Matching On-Device</p>
                 </div>
              </div>
            </div>

            {/* Actions Area */}
            <div className="mt-8">
              <button
                onClick={handleCapture}
                className="group relative w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-violet-600 text-white text-lg font-bold shadow-2xl shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center gap-2">
                  <Camera size={22} /> Capture & Find
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Privacy Note */}
        <div className="pb-10 px-6 text-center">
          <p className="text-[11px] font-medium text-zinc-400 max-w-[240px] mx-auto leading-normal italic">
            Your selfie is processed locally and is never uploaded or saved to our servers.
          </p>
        </div>
      </div>
    );
  }

  // viewState === 'gallery'
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #faf5ff 100%)' }}
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/60 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/25">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Your Matches</p>
              <p className="text-base font-black text-zinc-900 leading-tight">{event.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewState('camera')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
              title="Retake Selfie"
            >
              <Camera size={16} />
            </button>
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-2">
              <Images size={14} className="text-violet-500" />
              <span className="text-xs font-bold text-violet-700">{photos.length} photos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {photos.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <Images size={28} />
              </div>
              <p className="font-bold text-zinc-500">No photos found</p>
              <p className="text-sm text-zinc-400 mt-1">We couldn't find your face in any event photos.</p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => setViewState('camera')}
                  className="px-6 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition"
                >
                  Retake Photo
                </button>

              </div>
            </div>
          ) : (
            <>
              {event?.allow_download && (
                <div className="mb-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm px-5 py-3 flex items-center justify-between">
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
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className={`group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 bg-white/50 ${selectedIds.has(photo.id) ? 'ring-4 ring-violet-500/30 scale-[0.98]' : ''}`}
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

                    {event?.allow_download && (
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                        className={`absolute inset-0 transition-opacity duration-200 cursor-pointer ${selectedIds.has(photo.id) ? 'bg-violet-500/20 opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}
                      >
                        <div className="absolute top-3 left-3">
                          <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'bg-violet-500 border-violet-500 text-white' : 'bg-white/80 border-white/60 backdrop-blur-sm'}`}>
                            {selectedIds.has(photo.id) && <Check size={16} />}
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadSingle(photo); }}
                          className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/80 backdrop-blur-sm flex items-center justify-center text-zinc-600 hover:bg-white hover:text-violet-600 transition-all"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
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
        </div>
      )}

      {/* Styles */}
      {event?.theme_color && (
        <style dangerouslySetInnerHTML={{ __html: `
          .text-violet-500, .text-violet-600, .text-violet-700 { color: ${event.theme_color} !important; }
          .bg-violet-50 { background-color: ${event.theme_color}20 !important; }
          .bg-violet-500, .bg-violet-600, .bg-violet-700 { background-color: ${event.theme_color} !important; }
          .border-violet-100 { border-color: ${event.theme_color}30 !important; }
          .ring-violet-500\\/30 { --tw-ring-color: ${event.theme_color}4d !important; }
          .shadow-violet-500\\/20, .shadow-violet-500\\/25 { --tw-shadow-color: ${event.theme_color}33 !important; }
          .bg-gradient-to-br { background: linear-gradient(to bottom right, ${event.theme_color}, ${event.theme_color}dd) !important; }
        `}} />
      )}
    </div>
  );
}
