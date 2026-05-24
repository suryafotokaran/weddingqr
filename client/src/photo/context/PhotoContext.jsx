import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getSignedUrlForPath } from '../../lib/s3';

const PhotoContext = createContext();

export const usePhoto = () => {
  const context = useContext(PhotoContext);
  if (!context) throw new Error('usePhoto must be used within a PhotoProvider');
  return context;
};

// ── Sign helper ───────────────────────────────────────────────────────────────
async function signItems(items, pathField = 'storage_path') {
  return Promise.all(items.map(async item => {
    const path = item[pathField];
    if (!path) return item;
    try { return { ...item, url: await getSignedUrlForPath(path) }; }
    catch { return item; }
  }));
}

// ── Query functions ───────────────────────────────────────────────────────────
async function fetchBanners() {
  const { data, error } = await supabase
    .from('site_banners')
    .select('*')
    .eq('active', true)
    .order('display_order');
  if (error) throw error;
  return signItems(data ?? []);
}

async function fetchPortfolios() {
  const [portfoliosRes, photosRes] = await Promise.all([
    supabase.from('site_portfolios').select('*').eq('active', true).order('display_order'),
    supabase.from('site_portfolio_photos').select('*').order('display_order'),
  ]);

  const signedPhotos = await signItems(photosRes.data ?? []);

  const photosByPortfolio = signedPhotos.reduce((acc, p) => {
    if (!acc[p.portfolio_id]) acc[p.portfolio_id] = [];
    acc[p.portfolio_id].push({ id: p.id, url: p.url, storage_path: p.storage_path });
    return acc;
  }, {});

  return Promise.all((portfoliosRes.data ?? []).map(async p => {
    let cover_url = p.cover_url;
    if (p.cover_storage_path) {
      try { cover_url = await getSignedUrlForPath(p.cover_storage_path); } catch {}
    }
    return { id: p.id, name: p.name, cover_url, photos: photosByPortfolio[p.id] || [] };
  }));
}

async function fetchGallery() {
  const { data, error } = await supabase
    .from('site_gallery_photos')
    .select('*')
    .eq('active', true)
    .order('display_order');
  if (error) throw error;
  return signItems(data ?? []);
}

async function fetchTestimonials() {
  const { data } = await supabase
    .from('site_testimonials')
    .select('*')
    .eq('active', true)
    .order('display_order');
  return Promise.all((data ?? []).map(async t => {
    const rawPhotos = Array.isArray(t.photos) ? t.photos : [];
    if (rawPhotos.length === 0) return t;
    const signedPhotos = await Promise.all(rawPhotos.map(async p => {
      if (!p.storage_path) return p;
      try { return { ...p, url: await getSignedUrlForPath(p.storage_path) }; }
      catch { return p; }
    }));
    return { ...t, photos: signedPhotos };
  }));
}

async function fetchServices() {
  const { data } = await supabase
    .from('site_services')
    .select('*')
    .eq('active', true)
    .order('display_order');
  return data ?? [];
}

async function fetchSiteContent() {
  const { data } = await supabase.from('site_content').select('section, key, value');
  const nested = {};
  (data ?? []).forEach(({ section, key, value }) => {
    if (!nested[section]) nested[section] = {};
    nested[section][key] = value;
  });
  return nested;
}

// ── Provider ──────────────────────────────────────────────────────────────────
const STALE = 55 * 60 * 1000; // 55 min — just under signed-URL expiry of 1hr

export const PhotoProvider = ({ children }) => {
  // 1️⃣ Banners — highest priority, fires immediately
  const bannersQ = useQuery({
    queryKey: ['site-banners'],
    queryFn: fetchBanners,
    staleTime: STALE,
  });

  // 2️⃣ Everything else fires in parallel once banners succeed
  const ready = bannersQ.isSuccess;

  const portfoliosQ = useQuery({
    queryKey: ['site-portfolios'],
    queryFn: fetchPortfolios,
    staleTime: STALE,
    enabled: ready,
  });

  const galleryQ = useQuery({
    queryKey: ['site-gallery'],
    queryFn: fetchGallery,
    staleTime: STALE,
    enabled: ready,
  });

  const testimonialsQ = useQuery({
    queryKey: ['site-testimonials'],
    queryFn: fetchTestimonials,
    staleTime: STALE,
    enabled: ready,
  });

  const servicesQ = useQuery({
    queryKey: ['site-services'],
    queryFn: fetchServices,
    staleTime: STALE,
    enabled: ready,
  });

  const contentQ = useQuery({
    queryKey: ['site-content'],
    queryFn: fetchSiteContent,
    staleTime: STALE,
    enabled: ready,
  });

  const banners = bannersQ.data ?? [];

  const value = {
    desktopBanners:     banners.filter(b => b.type === 'desktop'),
    mobileBanners:      banners.filter(b => b.type === 'mobile'),
    portfolios:         portfoliosQ.data   ?? [],
    galleryPhotos:      galleryQ.data      ?? [],
    testimonials:       testimonialsQ.data ?? [],
    services:           servicesQ.data     ?? [],
    siteContent:        contentQ.data      ?? {},

    // Per-section loading flags — each section renders independently
    loadingBanners:      bannersQ.isLoading,
    loadingPortfolios:   !ready || portfoliosQ.isLoading,
    loadingGallery:      !ready || galleryQ.isLoading,
    loadingTestimonials: !ready || testimonialsQ.isLoading,
    loadingServices:     !ready || servicesQ.isLoading,

    // Legacy fallback used by some components
    loading: bannersQ.isLoading,
  };

  return (
    <PhotoContext.Provider value={value}>
      {children}
    </PhotoContext.Provider>
  );
};
