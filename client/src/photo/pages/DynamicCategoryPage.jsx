import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePhoto } from "../context/PhotoContext";
import { ArrowLeft, Camera, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const DynamicCategoryPage = () => {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const { portfolios, loading } = usePhoto();
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const portfolio = portfolios.find(p => p.id === portfolioId);
  const photos = portfolio?.photos || [];

  const selectedIndex = selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : -1;
  const showPrev = selectedIndex > 0;
  const showNext = selectedIndex < photos.length - 1;

  const goPrev = useCallback(() => {
    if (showPrev) setSelectedPhoto(photos[selectedIndex - 1]);
  }, [showPrev, photos, selectedIndex]);

  const goNext = useCallback(() => {
    if (showNext) setSelectedPhoto(photos[selectedIndex + 1]);
  }, [showNext, photos, selectedIndex]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape')     setSelectedPhoto(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedPhoto, goPrev, goNext]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm">
          <div className="max-w-[1280px] mx-auto px-4 py-6">
            <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
              <Skeleton height={24} width={150} />
              <Skeleton height={32} width={200} style={{ marginTop: "16px" }} />
              <Skeleton height={20} width={100} style={{ marginTop: "8px" }} />
            </SkeletonTheme>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 py-8">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} height={256} style={{ borderRadius: "8px" }} />
              ))}
            </SkeletonTheme>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Camera size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Portfolio Not Found</h3>
          <button onClick={() => navigate("/")} className="mt-4 px-6 py-2 bg-neutral-900 text-white rounded-md text-sm">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-transparent border-none cursor-pointer transition-colors duration-300 mb-4"
          >
            <ArrowLeft size={24} />
            Back to Home
          </button>
          <h1 className="text-[1.875rem] font-bold text-gray-900 mt-4 mb-2">{portfolio.name}</h1>
          <p className="text-gray-500 m-0">
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </p>
        </div>
      </div>

      {/* Photos grid */}
      <div className="max-w-[1280px] mx-auto px-4 py-8">
        {photos.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="relative overflow-hidden h-[256px]">
                  <img
                    src={photo.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center transition-all duration-300 group">
                    <Eye size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Camera size={64} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Photos Yet</h3>
            <p className="text-gray-500">Photos will appear here once added from the admin panel.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Prev */}
          {showPrev && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all duration-200"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Next */}
          {showNext && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all duration-200"
            >
              <ChevronRight size={28} />
            </button>
          )}

          <div
            className="relative max-w-[1280px] max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 bg-transparent border-none cursor-pointer z-10 transition-colors duration-300"
            >
              <X size={28} />
            </button>

            <img
              src={selectedPhoto.url}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            {/* Counter */}
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {selectedIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCategoryPage;
