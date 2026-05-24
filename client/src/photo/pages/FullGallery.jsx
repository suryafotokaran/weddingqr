import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePhoto } from "../context/PhotoContext";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const FullGallery = () => {
  const navigate = useNavigate();
  const [modalImage, setModalImage] = useState(null);
  const { galleryPhotos, loading } = usePhoto();

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
      <div className="min-h-screen py-8">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="sticky top-0 bg-white z-[100] flex justify-between items-center mb-8 pt-4 flex-wrap gap-4">
            <h1 className="text-2xl font-semibold text-neutral-900">Complete Gallery</h1>
            <Skeleton height={40} width={120} style={{ borderRadius: "4px" }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-[10px] sm:gap-[15px] py-5">
            <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
              {Array.from({ length: 20 }, (_, index) => (
                <div key={index} className="rounded-[10px] overflow-hidden shadow-md">
                  <Skeleton height={300} style={{ borderRadius: "8px" }} />
                </div>
              ))}
            </SkeletonTheme>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="sticky top-0 bg-white z-[100] flex justify-between items-center mb-8 pt-4 flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-neutral-900">Complete Gallery</h1>
          <button
            className="py-3 px-6 text-base font-medium text-white bg-neutral-900 rounded-md border-none outline-none cursor-pointer hover:bg-neutral-600 transition-colors duration-300"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[10px] sm:gap-[15px] py-5">
          {galleryPhotos.map((photo) => (
            <div key={photo.id} className="rounded-[10px] overflow-hidden shadow-md hover:scale-[1.05] transition-transform duration-300">
              <img
                src={photo.url}
                alt="gallery"
                className="w-full h-[200px] sm:h-[250px] object-cover cursor-pointer"
                onClick={() => openModal(photo.url)}
              />
            </div>
          ))}
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
      </div>
    </div>
  );
};

export default FullGallery;
