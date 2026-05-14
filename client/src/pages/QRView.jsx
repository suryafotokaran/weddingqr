import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSignedPhotoUrls } from '../lib/s3';
import {
  Images, CalendarDays, Loader2, Download, Check,
  Square, CheckSquare, X, Camera, ShieldCheck,
  ArrowLeft, RefreshCw, Sparkles,
} from 'lucide-react';
import { loadModels, extractSingleEmbedding } from '../lib/faceApi';

export default function QRView() {
  const { id } = useParams();

  /* ── State ── */
  const [event,        setEvent]        = useState(null);
  const [view,         setView]         = useState('initial'); // initial|landing|camera|processing|gallery
  const [photos,       setPhotos]       = useState([]);
  const [fatalError,   setFatalError]   = useState(null);   // only for offline/404
  const [toast,        setToast]        = useState(null);    // inline camera toast
  const [signedUrls,   setSignedUrls]   = useState({});
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [downloading,  setDownloading]  = useState(false);
  const [lightbox,     setLightbox]     = useState(null);
  const [modelsReady,  setModelsReady]  = useState(false);
  const [cameraReady,  setCameraReady]  = useState(false);
  const [processingMsg,setProcessingMsg]= useState('');

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  /* ── Screenshot protection ── */
  useEffect(() => {
    if (!event?.allow_screenshot) return;
    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['p','s'].includes(e.key)) e.preventDefault();
      if (e.key === 'F12') e.preventDefault();
    };
    window.addEventListener('contextmenu', block);
    window.addEventListener('keydown', blockKeys);
    return () => { window.removeEventListener('contextmenu', block); window.removeEventListener('keydown', blockKeys); };
  }, [event?.allow_screenshot]);

  /* ── Generate signed URLs when photos arrive ── */
  useEffect(() => {
    if (!photos.length) return;
    getSignedPhotoUrls(photos).then(urls => {
      if (Object.keys(urls).length) setSignedUrls(prev => ({ ...prev, ...urls }));
    });
  }, [photos]);

  const getPhotoUrl = useCallback((p) => signedUrls[p.id] || p.supabase_url || null, [signedUrls]);

  /* ── Init: fetch event + load models in parallel ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data, error: evErr }] = await Promise.all([
          supabase.from('events')
            .select('id,name,type,date,is_qr_live,allow_download,allow_screenshot,theme_color')
            .eq('id', id).single(),
          loadModels().then(() => { if (alive) setModelsReady(true); }).catch(console.error),
        ]);
        if (!alive) return;
        if (evErr || !data)   { setFatalError('Gallery not found or link is invalid.'); return; }
        if (!data.is_qr_live) { setFatalError('This gallery is currently offline. Contact the host.'); return; }
        setEvent(data);
        setView('landing');
      } catch (err) {
        console.error(err);
        if (alive) setFatalError('Failed to load. Please refresh.');
      }
    })();
    return () => { alive = false; };
  }, [id]);

  /* ── Camera lifecycle ── */
  useEffect(() => {
    if (view === 'camera') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [view]);

  const startCamera = async () => {
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.oncanplay = () => setCameraReady(true);
      }
    } catch {
      setFatalError('Camera permission is required to find your photos.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  /* ── Inline toast (stays on camera view) ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Core: extract embedding → call RPC → show photos ── */
  const processSearch = async (source) => {
    setProcessingMsg('Detecting your face…');
    setView('processing');
    try {
      // Ensure models loaded (singleton safe)
      if (!modelsReady) {
        setProcessingMsg('Loading AI models…');
        await loadModels();
        setModelsReady(true);
      }

      // Extract 128D face embedding in browser
      const descriptor = await extractSingleEmbedding(source);
      if (!descriptor) {
        setView('camera');
        showToast('No face detected. Center your face and ensure good lighting.');
        return;
      }

      setProcessingMsg('Searching event photos…');
      const embeddingStr = `[${Array.from(descriptor).join(',')}]`;

      // Query Supabase match_faces RPC
      const { data: matches, error: rpcErr } = await supabase.rpc('match_faces', {
        query_embedding: embeddingStr,
        match_threshold: 0.55,
        match_count:     60,
        p_event_id:      id,
      });

      if (rpcErr) {
        console.error('[FaceMatch] RPC error:', rpcErr);
        setView('camera');
        showToast(`Search failed: ${rpcErr.message}. Have you run the match_faces SQL in Supabase?`);
        return;
      }

      if (!matches?.length) {
        setPhotos([]);
        setView('gallery');
        return;
      }

      // Fetch full photo rows
      const ids = matches.map(m => m.photo_id);
      const { data: fullPhotos, error: fetchErr } = await supabase
        .from('photos').select('*').in('id', ids);
      if (fetchErr) throw fetchErr;

      // Preserve similarity sort order
      setPhotos(matches.map(m => fullPhotos.find(p => p.id === m.photo_id)).filter(Boolean));
      setView('gallery');
      stopCamera();
    } catch (err) {
      console.error('[FaceMatch] Fatal:', err);
      setView('camera');
      showToast('Something went wrong. Please try again.');
    }
  };

  /* ── Capture handlers ── */
  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;

    // Wait for stream to have real frames
    if (video.readyState < 2) {
      await new Promise(resolve => {
        const fn = () => { video.removeEventListener('canplay', fn); resolve(); };
        video.addEventListener('canplay', fn);
        setTimeout(resolve, 3000);
      });
    }

    // Give camera sensor 400ms to stabilise exposure after stream starts
    await new Promise(resolve => setTimeout(resolve, 400));

    processSearch(video);
  };



  /* ── Selection ── */
  const toggleSelect = (pid) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n;
  });
  const selectAll = () => {
    const allSel = photos.every(p => selectedIds.has(p.id));
    setSelectedIds(allSel ? new Set() : new Set(photos.map(p => p.id)));
  };

  /* ── Download ── */
  const downloadPhoto = async (photo) => {
    const url = getPhotoUrl(photo); if (!url) return;
    const blob = await fetch(url).then(r => r.blob());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = photo.file_name;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(a.href); document.body.removeChild(a);
  };

  const downloadSelected = async () => {
    setDownloading(true);
    for (const p of photos.filter(p => selectedIds.has(p.id))) {
      await downloadPhoto(p);
      await new Promise(r => setTimeout(r, 300));
    }
    setDownloading(false);
  };

  /* ── Theme override ── */
  const theme = event?.theme_color || '#5b21b6';
  const ThemeStyle = () => event?.theme_color ? (
    <style>{`
      .qv-accent { color: ${theme} !important; }
      .qv-bg { background-color: ${theme} !important; }
      .qv-border { border-color: ${theme} !important; }
    `}</style>
  ) : null;

  /* ════════════════════════════════════════════
     RENDER STATES
  ════════════════════════════════════════════ */

  /* Fatal error (gallery offline / not found) */
  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#fcfdff]">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-sm w-full text-center border border-zinc-100">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6 text-red-400">
            <X size={28} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-2">Unavailable</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">{fatalError}</p>
        </div>
      </div>
    );
  }

  /* Initial loading */
  if (view === 'initial') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcff]">
        <Loader2 className="animate-spin text-violet-500" size={40} />
      </div>
    );
  }

  /* Processing */
  if (view === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcff] p-6">
        <div className="bg-white rounded-3xl p-10 shadow-2xl border border-zinc-50 flex flex-col items-center max-w-xs text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-violet-100 rounded-full blur-xl animate-ping opacity-30" />
            <Loader2 className="animate-spin text-violet-600 relative" size={48} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 mb-1">Finding you</h2>
          <p className="text-sm text-zinc-400">{processingMsg}</p>
          <div className="mt-6 px-4 py-2 bg-green-50 rounded-xl flex items-center gap-2 border border-green-100">
            <ShieldCheck size={14} className="text-green-500" />
            <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Privacy Protected</span>
          </div>
        </div>
      </div>
    );
  }

  /* Landing */
  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a0a0f] relative overflow-hidden">
        <ThemeStyle />

        {/* Background glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-20%] w-[70%] h-[70%] rounded-full opacity-20 blur-[120px]" style={{ background: theme }} />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500 opacity-10 blur-[120px]" />
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Logo badge */}
          <div className="mb-10 relative">
            <div className="absolute inset-0 blur-2xl opacity-40 rounded-full" style={{ background: theme }} />
            <div className="relative w-20 h-20 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
              <Camera size={32} className="text-white" />
            </div>
          </div>

          {/* Event info */}
          <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px] mb-3">You're invited</p>
          <h1 className="text-4xl font-black tracking-tight text-white text-center leading-tight mb-4">{event.name}</h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full mb-12">
            <CalendarDays size={13} className="text-white/60" />
            <span className="text-white/70 text-sm font-semibold">
              {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* CTA */}
          <div className="w-full max-w-xs">
            <button
              onClick={() => setView('camera')}
              className="group w-full relative flex items-center justify-center gap-3 py-5 rounded-2xl text-white text-lg font-black shadow-2xl active:scale-[0.97] transition-all overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${theme}ee, ${theme})` }} />
              <Sparkles size={20} className="relative z-10" />
              <span className="relative z-10">Find My Photos</span>
            </button>
            <p className="text-white/30 text-xs text-center mt-5 leading-relaxed">
              Take a quick selfie — our AI will find all your photos from this event instantly.
            </p>
          </div>
        </div>

        <p className="relative text-center text-white/20 text-[10px] font-bold uppercase tracking-widest pb-8">Powered by WeddingQR</p>
      </div>
    );
  }

  /* Camera — full screen immersive */
  if (view === 'camera') {
    return (
      <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
        <ThemeStyle />

        {/* Full-screen video */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />

        {/* Dark overlay gradient — bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40 pointer-events-none" />

        {/* Loading overlay */}
        {!cameraReady && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin text-white/30 mx-auto mb-3" size={36} />
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Starting camera…</p>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-safe pt-6">
          <button
            onClick={() => setView('landing')}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/50 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="px-4 py-1.5 bg-black/30 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-2">
            <ShieldCheck size={12} className="text-green-400" />
            <span className="text-white/80 text-[10px] font-black uppercase tracking-widest">Secure · On-Device AI</span>
          </div>
        </div>

        {/* Face frame guide */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="relative w-64 h-80">
            {/* Animated corners */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] rounded-tl-2xl" style={{ borderColor: theme }} />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] rounded-tr-2xl" style={{ borderColor: theme }} />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] rounded-bl-2xl" style={{ borderColor: theme }} />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] rounded-br-2xl" style={{ borderColor: theme }} />
            <div className="absolute inset-0 rounded-2xl border border-white/10" />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="relative z-10 px-6 pb-safe pb-10">
          {/* Toast */}
          {toast && (
            <div className="mb-4 px-4 py-3 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 rounded-2xl flex items-start gap-2">
              <span className="text-amber-400 text-sm">⚠️</span>
              <p className="text-xs font-semibold text-amber-200 leading-relaxed">{toast}</p>
            </div>
          )}

          <p className="text-white/60 text-sm text-center mb-5 font-medium">
            Center your face in the frame and tap the button
          </p>

          {/* Shutter button */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleCapture}
              disabled={!cameraReady || !modelsReady}
              className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-white/60" />
              {/* Inner fill */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: (!cameraReady || !modelsReady) ? '#ffffff30' : theme }}
              >
                {(!cameraReady || !modelsReady)
                  ? <Loader2 size={22} className="animate-spin text-white" />
                  : <Camera size={22} className="text-white" />
                }
              </div>
            </button>
          </div>

          <p className="text-white/30 text-[10px] text-center mt-4 font-bold uppercase tracking-widest">
            {!modelsReady ? 'Loading AI…' : !cameraReady ? 'Starting camera…' : 'Tap to find your photos'}
          </p>
        </div>
      </div>
    );
  }

  /* Gallery */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8f9ff' }}>
      <ThemeStyle />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('landing')} className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: theme }}>Your Photos</p>
              <p className="text-base font-black text-zinc-900 leading-none">{event.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('camera')}
              className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition"
              title="Search again"
            >
              <RefreshCw size={16} />
            </button>
            <div className="px-4 py-2 rounded-xl text-white text-sm font-black flex items-center gap-2" style={{ background: theme }}>
              <Images size={14} className="opacity-80" />
              {photos.length} {photos.length === 1 ? 'Match' : 'Matches'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {photos.length === 0 ? (
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-lg p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center mx-auto mb-6 text-zinc-200">
                <Images size={36} />
              </div>
              <h2 className="text-xl font-black text-zinc-900 mb-2">No matches found</h2>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
                We couldn't find you in this event's photos. Try again with better lighting or a different angle.
              </p>
              <div className="mt-8 flex justify-center">
                <button onClick={() => setView('camera')} className="px-8 py-3.5 rounded-2xl text-white font-black text-sm active:scale-95 transition flex items-center gap-2" style={{ background: theme }}>
                  <Camera size={16} /> Retake Selfie
                </button>
              </div>
            </div>
          ) : (
            <>
              {event?.allow_download && (
                <div className="mb-5 bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm px-5 py-3 flex items-center justify-between">
                  <button onClick={selectAll} className="flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-zinc-700 transition uppercase tracking-widest">
                    {photos.every(p => selectedIds.has(p.id)) ? <CheckSquare size={18} style={{ color: theme }} /> : <Square size={18} />}
                    {photos.every(p => selectedIds.has(p.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button onClick={downloadSelected} disabled={downloading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold active:scale-95 transition disabled:opacity-50" style={{ background: theme }}>
                      {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      {downloading ? 'Downloading…' : `Download ${selectedIds.size}`}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 bg-zinc-100"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {getPhotoUrl(photo) ? (
                      <img
                        src={getPhotoUrl(photo)}
                        alt={photo.file_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                        loading="lazy"
                        onClick={() => setLightbox(photo)}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Loader2 size={20} className="animate-spin text-zinc-300" />
                      </div>
                    )}

                    {event?.allow_download && (
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                        className={`absolute inset-0 cursor-pointer transition-all ${selectedIds.has(photo.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{ background: selectedIds.has(photo.id) ? `${theme}30` : 'rgba(0,0,0,0.25)' }}
                      >
                        <div className={`absolute top-3 left-3 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'bg-white border-white' : 'bg-white/30 border-white/60 backdrop-blur-sm'}`}>
                          {selectedIds.has(photo.id) && <Check size={14} style={{ color: theme }} strokeWidth={3} />}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }}
                          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-white text-zinc-800 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all"
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
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
            <X size={20} />
          </button>
          {event?.allow_download && (
            <button onClick={(e) => { e.stopPropagation(); downloadPhoto(lightbox); }} className="absolute top-5 left-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-zinc-900 text-sm font-black shadow-xl hover:bg-zinc-100 transition">
              <Download size={16} /> Download
            </button>
          )}
          <img
            src={getPhotoUrl(lightbox)}
            alt={lightbox.file_name}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
