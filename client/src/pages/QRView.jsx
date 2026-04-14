import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSignedPhotoUrls } from '../lib/s3';
import {
  Images, CalendarDays, Tag, Loader2, Download, Check,
  Square, CheckSquare, QrCode, EyeOff, X, Camera, User
} from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';

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
        Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]).catch(err => console.error("FaceAPI models failed to load", err));

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
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        setError('No face detected. Please make sure your face is visible and in good lighting.');
        return;
      }

      const embeddingArray = Array.from(detection.descriptor);

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
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #faf5ff 100%)' }}>
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-3xl bg-violet-100 flex items-center justify-center mx-auto mb-5 text-violet-600 shadow-inner">
            <Tag size={28} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 mb-1">{event.name}</h2>
          <p className="text-sm font-medium text-zinc-500 mb-8">{new Date(event.date).toLocaleDateString()}</p>
          
          <button
            onClick={() => setViewState('camera')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-violet-600 text-white text-base font-bold shadow-lg shadow-violet-500/25 hover:bg-violet-700 active:scale-[0.98] transition-all mb-4"
          >
            <Camera size={20} /> Find My Photos
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
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #faf5ff 100%)' }}>
        <Loader2 className="animate-spin text-violet-500 mb-4" size={40} />
        <h2 className="text-xl font-bold text-zinc-800">
          {viewState === 'initial' ? 'Loading Gallery...' : 'Finding your magic moments...'}
        </h2>
        <p className="text-sm text-zinc-500 mt-2 text-center max-w-sm px-6">
          {viewState === 'processing' && 'We are matching your face securely. Your photo never leaves your device.'}
        </p>
      </div>
    );
  }

  if (viewState === 'camera') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #faf5ff 100%)' }}>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden text-center">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4 text-violet-600">
                <User size={24} />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">Take a Selfie</h2>
              <p className="text-sm text-zinc-500 mb-6 px-4">
                Take a quick selfie to find all your photos from <b>{event?.name}</b>. Your selfie stays on your device and is never uploaded.
              </p>
              
              <div className="relative w-full aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {!streamRef.current && (
                  <Loader2 className="animate-spin text-white absolute" size={32} />
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Face guide overlay */}
                <div className="absolute inset-x-[15%] inset-y-[20%] border-2 border-dashed border-white/50 rounded-[4rem] pointer-events-none" />
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleCapture}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-violet-600 text-white text-base font-bold shadow-lg shadow-violet-500/25 hover:bg-violet-700 active:scale-[0.98] transition-all"
                >
                  <Camera size={20} />
                  Capture & Find
                </button>

              </div>
            </div>
          </div>
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
