import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getSignedPhotoUrls } from '../lib/s3';

const PAGE_SIZE = 20;

async function fetchPhotosPage({ pageParam, eventId }) {
  const from = pageParam * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, file_name, created_at, supabase_url')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const photos     = data ?? [];
  const signedUrls = photos.length > 0 ? await getSignedPhotoUrls(photos) : {};

  return {
    photos,
    signedUrls,
    nextPage: photos.length === PAGE_SIZE ? pageParam + 1 : undefined,
  };
}
import { Loader2, Lock, Image as ImageIcon, Heart, ShieldAlert, Download, Eye, EyeOff, ChevronLeft, ChevronRight, X, CheckCircle, Send, MessageCircle } from 'lucide-react';

function SkeletonBlock({ className = "" }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-200 rounded-xl ${className}`}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

function GuestSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-100 px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <SkeletonBlock className="w-48 h-6" />
              <SkeletonBlock className="w-32 h-3" />
            </div>
            <SkeletonBlock className="w-10 h-10 rounded-full" />
          </div>
          <div className="flex gap-6">
            <SkeletonBlock className="w-20 h-4" />
            <SkeletonBlock className="w-20 h-4" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
            <SkeletonBlock key={i} className="aspect-square" />
          ))}
        </div>
      </main>
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
    </div>
  );
}

export default function GuestEventView() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [modalIndex, setModalIndex] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitName, setSubmitName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoComments, setPhotoComments] = useState({});
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [limitWarning, setLimitWarning] = useState(false);
  const sentinelRef = useRef(null);

  // ── Server-side paginated photos ─────────────────────────────────────────
  const photosQuery = useInfiniteQuery({
    queryKey:         ['event-photos', id],
    queryFn:          ({ pageParam }) => fetchPhotosPage({ pageParam, eventId: id }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled:          isAuthenticated && !!event && event.is_public,
    staleTime:        30_000,
  });

  const allPhotos  = photosQuery.data?.pages.flatMap(p => p.photos) ?? [];
  const signedUrls = Object.assign({}, ...(photosQuery.data?.pages.map(p => p.signedUrls) ?? []));

  const [guestId, setGuestId] = useState(() => {
    const saved = localStorage.getItem('guest_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('guest_id', newId);
    return newId;
  });

  const getPhotoUrl = (photo) => signedUrls[photo.id] || photo.supabase_url || null;

  // 'all' shows everything loaded so far; 'favorites' filters to hearted photos
  const visiblePhotos = allPhotos.filter(p => activeTab === 'all' || favorites.has(p.id));

  const closeModal = useCallback(() => setModalIndex(null), []);
  const prevPhoto  = useCallback(() => setModalIndex(i => (i - 1 + visiblePhotos.length) % visiblePhotos.length), [visiblePhotos.length]);
  const nextPhoto  = useCallback(() => setModalIndex(i => (i + 1) % visiblePhotos.length), [visiblePhotos.length]);

  useEffect(() => {
    if (modalIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'Escape')     closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalIndex, prevPhoto, nextPhoto, closeModal]);

  // Fetch/refresh thread when switching photos in modal
  useEffect(() => {
    setShowCommentInput(false);
    setCommentText('');
    if (modalIndex === null || !visiblePhotos[modalIndex]) return;
    fetchCommentsForPhoto(visiblePhotos[modalIndex].id);
  }, [modalIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEvent();
    fetchSubmissionThenSelections();
  }, [id]);

  async function fetchSubmissionThenSelections() {
    const { data } = await supabase
      .from('guest_submissions')
      .select('*')
      .eq('event_id', id)
      .eq('guest_id', guestId)
      .maybeSingle();
    if (data) setSubmission(data);
    // Only restore previous selections when locked (submitted state)
    // When re-selection is open (is_locked = false), guest starts fresh
    if (!data || data.is_locked !== false) {
      await fetchGuestSelections();
    }
  }

  async function fetchCommentsForPhoto(photoId) {
    const { data } = await supabase
      .from('photo_comments')
      .select('*')
      .eq('photo_id', photoId)
      .order('created_at', { ascending: true });
    setPhotoComments(prev => ({ ...prev, [photoId]: data ?? [] }));
  }

  async function handleSubmitComment(photoId) {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    await supabase.from('photo_comments').insert({
      photo_id:    photoId,
      event_id:    id,
      sender_type: 'guest',
      sender_id:   guestId,
      sender_name: submission?.guest_name ?? null,
      message:     commentText.trim(),
    });
    setCommentText('');
    setSubmittingComment(false);
    await fetchCommentsForPhoto(photoId);
  }

  async function fetchGuestSelections() {
    try {
      const { data, error } = await supabase
        .from('guest_selections')
        .select('photo_id')
        .eq('event_id', id)
        .eq('guest_id', guestId);

      if (error) throw error;
      if (data) {
        setFavorites(new Set(data.map(s => s.photo_id)));
      }
    } catch (err) {
      console.error('Error fetching guest selections:', err);
    }
  }

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
      // Block F12 (DevTools) - partial deterrent
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

  async function fetchEvent() {
    try {
      setLoading(true);
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Event not found');
      setEvent(eventData);

      // If link is disabled, stop here
      if (!eventData.is_public) {
        setLoading(false);
        return;
      }

      // If no password is set, mark authenticated (useInfiniteQuery will auto-fetch)
      if (!eventData.password) {
        setIsAuthenticated(true);
      } else {
        // Check for stored password
        const savedPwd = localStorage.getItem(`pwd_${id}`);
        if (savedPwd === eventData.password) {
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Infinite scroll: fetch next page when sentinel comes into view
  const photosQueryRef = useRef(photosQuery);
  photosQueryRef.current = photosQuery;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && photosQueryRef.current.hasNextPage && !photosQueryRef.current.isFetchingNextPage) {
          photosQueryRef.current.fetchNextPage();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []); // stable — reads latest query state via ref

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === event.password) {
      localStorage.setItem(`pwd_${id}`, password);
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };

  const handleSubmitSelection = async () => {
    if (!submitName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('guest_submissions')
        .upsert({
          event_id:    id,
          guest_id:    guestId,
          guest_name:  submitName.trim(),
          submitted_at: new Date().toISOString(),
          photo_count: favorites.size,
          is_locked:   true,
        }, { onConflict: 'event_id,guest_id' })
        .select()
        .single();
      if (error) throw error;
      setSubmission(data);
      setShowSubmitModal(false);
    } catch (err) {
      console.error('Submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = submission?.is_locked === true;

  const toggleFavorite = async (photoId) => {
    if (isLocked) return;
    const isAdding = !favorites.has(photoId);
    if (isAdding && event.max_selections && favorites.size >= event.max_selections) {
      setLimitWarning(true);
      return;
    }
    
    // Optimistic UI update
    setFavorites(prev => {
      const next = new Set(prev);
      if (isAdding) next.add(photoId);
      else next.delete(photoId);
      return next;
    });

    // Sync with DB
    try {
      if (isAdding) {
        await Promise.all([
          supabase.rpc('increment_likes', { p_photo_id: photoId }),
          supabase.from('guest_selections').insert({
            event_id: id,
            photo_id: photoId,
            guest_id: guestId
          })
        ]);
      } else {
        await Promise.all([
          supabase.rpc('decrement_likes', { p_photo_id: photoId }),
          supabase.from('guest_selections')
            .delete()
            .eq('guest_id', guestId)
            .eq('photo_id', photoId)
        ]);
      }
    } catch (err) {
      console.error('Failed to sync heart with DB:', err);
    }
  };

  const handleDownloadFavorites = async () => {
    const favPhotos = allPhotos.filter(p => favorites.has(p.id));
    if (favPhotos.length === 0) return;

    setIsDownloading(true);
    for (const photo of favPhotos) {
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
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error('Download failed', err);
      }
    }
    setIsDownloading(false);
  };

  if (loading && !event) {
    return <GuestSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 max-w-md w-full text-center">
          <p className="text-red-500 font-bold">Event not found</p>
          <p className="text-zinc-500 mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (event && !event.is_public) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-zinc-100 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-3xl bg-zinc-50 flex items-center justify-center mb-6 mx-auto text-zinc-400">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Link Disabled</h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            The owner has temporarily disabled this link. Please check back later or contact the host.
          </p>
          <div className="mt-8 pt-8 border-t border-zinc-50">
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">WeddingQR Privacy</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && event.password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-teal-100 max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-6 mx-auto text-teal-600">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 text-center mb-2">{event.name}</h2>
          <p className="text-zinc-500 text-center text-sm mb-6 uppercase tracking-widest font-bold">Password Protected</p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border-2 border-zinc-100 focus:border-teal-500 outline-none transition-all text-center font-bold pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {authError && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{authError}</p>}
            <button 
              type="submit"
              className="w-full py-4 rounded-xl silk-gradient text-white font-black text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
            >
              Access Photos
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Limit warning modal */}
      {limitWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-zinc-800 mb-2">Selection Limit Reached</h3>
            <p className="text-zinc-500 text-sm mb-6">
              You can only select up to <span className="font-semibold text-zinc-800">{event.max_selections}</span> photo{event.max_selections !== 1 ? 's' : ''}.
            </p>
            <button
              onClick={() => setLimitWarning(false)}
              className="bg-zinc-900 text-white rounded-xl px-8 py-2.5 text-sm font-semibold hover:bg-zinc-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Header and Tabs */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-20 px-6 pt-4">
        <div className="max-w-6xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-black text-zinc-900 leading-tight">{event.name}</h1>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{event.type} • {allPhotos.length} Photos</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 shrink-0">
              <ImageIcon size={20} />
            </div>
          </div>

          {/* Action buttons row — shown only when needed */}
          {((!isLocked && favorites.size > 0) || isLocked || (favorites.size > 0 && event.allow_download)) && (
            <div className="flex items-center gap-2 mb-3">
              {favorites.size > 0 && event.allow_download && (
                <button
                  onClick={handleDownloadFavorites}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download {favorites.size} Selected
                </button>
              )}
              {!isLocked && favorites.size > 0 && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold hover:bg-violet-600 transition-all active:scale-95 shadow-md shadow-violet-500/20"
                >
                  <Send size={13} /> Submit Selection
                </button>
              )}
              {isLocked && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle size={13} className="text-green-600" />
                  <span className="text-xs font-bold text-green-700">Submitted</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-3 text-xs font-bold transition-all relative ${activeTab === 'all' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              All Photos
              {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />}
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${activeTab === 'favorites' ? 'text-pink-500' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Your Selections
              <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${activeTab === 'favorites' ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-400'}`}>
                {favorites.size}
              </div>
              {event.max_selections ? <span className="text-[10px] text-zinc-400 font-medium">/ {event.max_selections}</span> : null}
              {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-full" />}
            </button>
          </div>
        </div>
      </header>

      {/* Submission banner */}
      {isLocked && submission && (
        <div className="bg-green-50 border-b border-green-100 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <CheckCircle size={16} className="text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">
                Selection submitted by {submission.guest_name} · {submission.photo_count} photo{submission.photo_count !== 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-green-600">
                {new Date(submission.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <main className="max-w-6xl mx-auto p-6">
        {photosQuery.isLoading ? null : allPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center text-zinc-300 mb-4">
              <ImageIcon size={32} />
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No photos yet</p>
            <p className="text-zinc-400 text-xs mt-1">Check back later once the event starts!</p>
          </div>
        ) : activeTab === 'favorites' && favorites.size === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-3xl bg-pink-50 flex items-center justify-center text-pink-200 mb-4">
              <Heart size={32} />
            </div>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No selections yet</p>
            <p className="text-zinc-400 text-xs mt-1">Select the photos you want to keep them here!</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visiblePhotos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setModalIndex(idx)}
                className={`group relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${favorites.has(photo.id) ? 'scale-[1.02] ring-4 ring-pink-500/20 shadow-lg shadow-pink-500/10' : 'bg-zinc-200 shadow-sm hover:scale-[1.02]'}`}
              >
                {getPhotoUrl(photo) ? (
                  <img
                    src={getPhotoUrl(photo)}
                    alt={photo.file_name}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <Loader2 size={20} className="animate-spin text-zinc-300" />
                  </div>
                )}
                {/* Heart — top right, stops propagation so it doesn't open modal */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                  className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all
                    ${favorites.has(photo.id)
                      ? 'bg-pink-500 text-white scale-110'
                      : 'bg-black/30 text-white/80 backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-pink-500/80'}`}
                >
                  <Heart size={15} fill={favorites.has(photo.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center py-8">
            {photosQuery.isFetchingNextPage && (
              <Loader2 size={24} className="animate-spin text-zinc-300" />
            )}
          </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 text-center">
        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">Created with WeddingQR</p>
      </footer>

      {event?.theme_color && (
        <style dangerouslySetInnerHTML={{ __html: `
          .text-teal-600, .text-teal-700, .text-pink-500, .text-pink-600, .text-pink-200 { color: ${event.theme_color} !important; }
          .bg-teal-50, .bg-teal-100, .bg-pink-50, .bg-pink-100 { background-color: ${event.theme_color}20 !important; }
          .bg-teal-600, .bg-teal-500, .bg-pink-500 { background-color: ${event.theme_color} !important; }
          .border-teal-100, .border-teal-500 { border-color: ${event.theme_color}30 !important; }
          .ring-pink-500\\/20 { --tw-ring-color: ${event.theme_color}33 !important; }
          .shadow-teal-500\\/20, .shadow-teal-500\\/30, .shadow-pink-500\\/10 { --tw-shadow-color: ${event.theme_color}33 !important; }
          .silk-gradient { background: linear-gradient(135deg, ${event.theme_color}, ${event.theme_color}dd) !important; }
        `}} />
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowSubmitModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-5">
              <Heart size={26} className="text-pink-500" fill="currentColor" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 text-center mb-1">Submit Your Selection</h2>
            <p className="text-sm text-zinc-500 text-center mb-6">
              You've selected <span className="font-bold text-zinc-800">{favorites.size} photo{favorites.size !== 1 ? 's' : ''}</span>. Once submitted, you cannot change your selection unless the photographer allows it.
            </p>
            <input
              type="text"
              placeholder="Your name"
              value={submitName}
              onChange={e => setSubmitName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-zinc-100 focus:border-pink-400 outline-none text-sm font-semibold mb-4 transition-all"
              autoFocus
            />
            <button
              onClick={handleSubmitSelection}
              disabled={!submitName.trim() || submitting}
              className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-black text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              {submitting ? 'Submitting…' : 'Confirm & Submit'}
            </button>
            <button onClick={() => setShowSubmitModal(false)} className="w-full mt-3 py-2 text-sm text-zinc-400 hover:text-zinc-600 font-semibold transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Full-size Modal */}
      {modalIndex !== null && visiblePhotos[modalIndex] && (() => {
        const photo = visiblePhotos[modalIndex];
        const isFav = favorites.has(photo.id);
        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm" onClick={() => { if (showCommentInput) { setShowCommentInput(false); } else { closeModal(); } }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-white/50 text-xs font-bold">{modalIndex + 1} / {visiblePhotos.length}</span>
              <button onClick={closeModal} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Image + arrows */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 px-14" onClick={e => { e.stopPropagation(); if (showCommentInput) setShowCommentInput(false); }}>
              <button onClick={prevPhoto} className="absolute left-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95">
                <ChevronLeft size={22} />
              </button>

              <img
                key={photo.id}
                src={getPhotoUrl(photo)}
                alt={photo.file_name}
                className="max-h-full max-w-full object-contain rounded-xl select-none"
                draggable={false}
              />

              <button onClick={nextPhoto} className="absolute right-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95">
                <ChevronRight size={22} />
              </button>
            </div>

            {/* Bottom — heart + comment */}
            <div className="shrink-0 flex flex-col items-center gap-3 py-4 px-4 w-full" onClick={e => { e.stopPropagation(); setShowCommentInput(false); }}>

              {/* Chat panel */}
              {showCommentInput && (
                <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200" onClick={e => e.stopPropagation()}>
                  {/* Thread header */}
                  <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
                    <MessageCircle size={12} className="text-white/40" />
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Photo Feedback</p>
                  </div>

                  {/* Messages */}
                  <div className="max-h-44 overflow-y-auto p-3 space-y-2">
                    {(photoComments[photo.id] ?? []).length === 0 ? (
                      <p className="text-center text-white/25 text-xs py-4">No messages yet — start the conversation</p>
                    ) : (
                      (photoComments[photo.id] ?? []).map(msg => {
                        const isMe = msg.sender_type === 'guest' && msg.sender_id === guestId;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${isMe ? 'bg-violet-500 text-white rounded-br-sm' : 'bg-white/15 text-white rounded-bl-sm'}`}>
                              {!isMe && <p className="text-[10px] font-bold text-white/50 mb-0.5">Photographer</p>}
                              <p>{msg.message}</p>
                              <p className={`text-[9px] mt-1 ${isMe ? 'text-violet-200' : 'text-white/30'}`}>
                                {new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                {' · '}
                                {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input row */}
                  <div className="p-3 border-t border-white/10 flex gap-2">
                    <input
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(photo.id); } }}
                      placeholder="Type a message..."
                      autoFocus
                      className="flex-1 bg-white/10 text-white placeholder-white/30 border border-white/15 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400"
                    />
                    <button
                      onClick={() => handleSubmitComment(photo.id)}
                      disabled={submittingComment || !commentText.trim()}
                      className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-violet-600 transition-all active:scale-95 shrink-0"
                    >
                      {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => toggleFavorite(photo.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all active:scale-95 ${isFav ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/40' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
                >
                  <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
                  {isFav ? 'Selected' : 'Select this photo'}
                </button>

                {/* Comment button */}
                {(() => {
                  const threadCount = (photoComments[photo.id] ?? []).length;
                  return (
                    <button
                      onClick={() => setShowCommentInput(prev => !prev)}
                      className={`relative flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm transition-all active:scale-95 ${showCommentInput ? 'bg-white/20 text-white' : threadCount > 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'}`}
                    >
                      <MessageCircle size={18} fill={threadCount > 0 ? 'currentColor' : 'none'} />
                      {threadCount > 0 ? `${threadCount} message${threadCount > 1 ? 's' : ''}` : 'Feedback'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

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
