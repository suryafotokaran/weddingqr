import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, Image as ImageIcon, Heart, ShieldAlert, Download, Eye, EyeOff } from 'lucide-react';

export default function GuestEventView() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'favorites'
  const [guestId, setGuestId] = useState(() => {
    const saved = localStorage.getItem('guest_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('guest_id', newId);
    return newId;
  });

  useEffect(() => {
    fetchEvent();
    fetchGuestSelections();
  }, [id]);

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
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // If link is disabled, stop here
      if (!eventData.is_public) {
        setLoading(false);
        return;
      }

      // If no password is set, fetch photos immediately
      if (!eventData.password) {
        setIsAuthenticated(true);
        fetchPhotos();
      } else {
        // Check for stored password
        const savedPwd = localStorage.getItem(`pwd_${id}`);
        if (savedPwd === eventData.password) {
          setIsAuthenticated(true);
          fetchPhotos();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      const hasAccess = !eventData?.password || (eventData?.password && localStorage.getItem(`pwd_${id}`) === eventData.password);
      if (hasAccess) setLoading(false);
      // If it has a password and no saved match, loading stays true until password form is shown? 
      // Actually, if it has a password, we show the password screen, so loading should be false then too.
      if (eventData?.password) setLoading(false);
    }
  }

  async function fetchPhotos() {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === event.password) {
      localStorage.setItem(`pwd_${id}`, password);
      setIsAuthenticated(true);
      setAuthError('');
      fetchPhotos();
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };

  const toggleFavorite = async (photoId) => {
    const isAdding = !favorites.has(photoId);
    
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
    const favPhotos = photos.filter(p => favorites.has(p.id));
    if (favPhotos.length === 0) return;

    setIsDownloading(true);
    for (const photo of favPhotos) {
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
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error('Download failed', err);
      }
    }
    setIsDownloading(false);
  };

  if (loading && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="animate-spin text-teal-600" size={32} />
      </div>
    );
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
      {/* Header and Tabs */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-20 px-6 pt-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-zinc-900 leading-tight">{event.name}</h1>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">{event.type} • {photos.length} Photos</p>
            </div>
            <div className="flex items-center gap-3">
              {favorites.size > 0 && event.allow_download && (
                <button 
                  onClick={handleDownloadFavorites}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download {favorites.size} Hearts
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400">
                <ImageIcon size={20} />
              </div>
            </div>
          </div>

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
              Your Hearts
              <div className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${activeTab === 'favorites' ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-400'}`}>
                {favorites.size}
              </div>
              {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-full" />}
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto p-6">
        {photos.length === 0 ? (
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
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No hearts yet</p>
            <p className="text-zinc-400 text-xs mt-1">Heart the photos you love to see them here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos
              .filter(photo => activeTab === 'all' || favorites.has(photo.id))
              .map(photo => (
              <div key={photo.id} className={`group relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 ${favorites.has(photo.id) ? 'scale-[1.02] ring-4 ring-pink-500/20 shadow-lg shadow-pink-500/10' : 'bg-zinc-200 shadow-sm hover:scale-[1.02]'}`}>
                <img 
                  src={photo.supabase_url} 
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div 
                  onClick={() => toggleFavorite(photo.id)}
                  className={`absolute inset-0 transition-all duration-300 cursor-pointer ${favorites.has(photo.id) ? 'bg-pink-500/10 opacity-100' : 'bg-black/20 opacity-0 group-hover:opacity-100'}`}
                >
                  <div className="absolute top-3 right-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${favorites.has(photo.id) ? 'bg-pink-500 text-white scale-110' : 'bg-white/20 text-white/60 hover:text-white backdrop-blur-md'}`}>
                      <Heart size={16} fill={favorites.has(photo.id) ? 'currentColor' : 'none'} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 text-center">
        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">Created with WeddingQR</p>
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
