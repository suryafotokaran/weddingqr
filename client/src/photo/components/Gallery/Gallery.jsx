import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePhoto } from "../../context/PhotoContext";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const PAGE_SIZE = 8;

const Gallery = () => {
  const navigate = useNavigate();
  const [modalImage, setModalImage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { galleryPhotos, loadingGallery: loading } = usePhoto();

  // Shuffle once when photos load, not on every render
  const shuffledImages = useMemo(
    () => [...galleryPhotos].sort(() => 0.5 - Math.random()),
    [galleryPhotos]
  );

  const visibleImages = shuffledImages.slice(0, visibleCount);
  const hasMore = visibleCount < shuffledImages.length;

  const openModal = (imageSrc) => {
    setModalImage(imageSrc);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setModalImage(null);
    document.body.style.overflow = "unset";
  };

  if (loading) {
    return (
      <section className="max-w-[1200px] mx-auto py-20 px-4">
        <h2
          className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
          style={{ fontFamily: "Merriweather, serif" }}
        >
          ~ GALLERY ~
        </h2>
        <div className="gallery__grid grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 my-8">
          <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
              <Skeleton key={index} height={300} style={{ borderRadius: "8px" }} />
            ))}
          </SkeletonTheme>
        </div>
        <div className="text-center">
          <Skeleton height={45} width={150} style={{ borderRadius: "4px" }} />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1200px] mx-auto py-20 px-4">
      <h2
        className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
        style={{ fontFamily: "Merriweather, serif" }}
      >
        ~ GALLERY ~
      </h2>
      <div className="gallery__grid grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 my-8">
        {visibleImages.map((photo, i) => (
          <img
            key={photo.id}
            src={photo.url}
            alt="photography gallery"
            loading={i < 2 ? 'eager' : 'lazy'}
            style={{ width: "280px", height: "420px", objectFit: "cover" }}
            onClick={() => openModal(photo.url)}
          />
        ))}
      </div>
      <div className="text-center flex items-center justify-center gap-4 flex-wrap">
        {hasMore && (
          <button
            className="py-3 px-6 text-base font-medium text-neutral-900 bg-white rounded-md border border-neutral-900 outline-none cursor-pointer hover:bg-neutral-100 transition-colors duration-300"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          >
            VIEW MORE
          </button>
        )}
        <button
          className="py-3 px-6 text-base font-medium text-white bg-neutral-900 rounded-md border-none outline-none cursor-pointer hover:bg-neutral-600 transition-colors duration-300"
          onClick={() => navigate("/gallery")}
        >
          VIEW GALLERY
        </button>
      </div>

      {modalImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000] p-8"
          style={{ opacity: 0, animation: "modalFadeIn 0.3s ease-out forwards" }}
          onClick={closeModal}
        >
          <div
            className="relative w-[1000px] h-[800px] max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            style={{ transform: "scale(0.8)", animation: "modalZoomIn 0.3s ease-out forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalImage}
              alt="Full size gallery image"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              className="absolute -top-5 -right-5 w-[45px] h-[45px] bg-white border-none rounded-full flex items-center justify-center cursor-pointer text-2xl text-neutral-900 shadow-lg hover:bg-neutral-900 hover:text-white transition-all duration-300 z-[1001]"
              onClick={closeModal}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;
