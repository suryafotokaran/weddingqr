import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePhoto } from "../../context/PhotoContext";

const SHOW = 4; // photos visible in one row

const avatar = (letter) => (
  <div className="w-[60px] h-[60px] rounded-full bg-[#ddd] flex items-center justify-center text-2xl font-bold text-[#666] mx-auto mb-5">
    {letter}
  </div>
);

const Clients = () => {
  const { testimonials, loadingTestimonials } = usePhoto();
  const [modalPhotos, setModalPhotos] = useState(null); // array of photos or null

  useEffect(() => {
    if (testimonials.length === 0) return;
    if (typeof window === "undefined" || !window.Swiper) return;
    const swiper = new window.Swiper(".swiper", {
      loop: false,
      navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
      pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: false },
      autoplay: { delay: 4000, disableOnInteraction: false },
      slidesPerView: 1,
      spaceBetween: 30,
    });
    return () => swiper.destroy(true, true);
  }, [testimonials]);

  if (loadingTestimonials) return null;
  if (testimonials.length === 0) return null;

  return (
    <section id="client" className="py-20 pb-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2
          className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
          style={{ fontFamily: "Merriweather, serif" }}
        >
          ~ TESTIMONIALS ~
        </h2>
      </div>
      <div className="max-w-[1200px] mx-auto px-12">
        <div className="swiper">
          <div className="swiper-wrapper">
            {testimonials.map((t) => {
              const photos = Array.isArray(t.photos) ? t.photos : [];
              const visible = photos.slice(0, SHOW);
              const remaining = photos.length - SHOW;

              return (
                <div key={t.id} className="swiper-slide">
                  <div className="max-w-[700px] mx-auto text-center px-4">
                    {avatar(t.initial)}
                    <p className="mb-4 text-neutral-500 leading-7">{t.review}</p>
                    <div className="star-rating">
                      {[...Array(t.stars || 5)].map((_, si) => (
                        <i key={si} className="ri-star-fill"></i>
                      ))}
                    </div>
                    <h4 className="text-[1.2rem] font-semibold text-neutral-900">{t.name}</h4>

                    {/* Photos — one row, max 4, +N overlay on last */}
                    {photos.length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs text-neutral-400 mb-3 tracking-wide uppercase">
                          Photos from their session
                        </p>
                        <div className="flex justify-center gap-2">
                          {visible.map((p, i) => {
                            const isLast = i === SHOW - 1 && remaining > 0;
                            return (
                              <div
                                key={i}
                                className="relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer flex-shrink-0"
                                onClick={() => setModalPhotos(photos)}
                              >
                                <img
                                  src={p.url}
                                  alt={`Wedding photography by Fotokaran Studio Tirunelveli – ${t.name}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                                {isLast && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-white text-lg font-bold">+{remaining}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="swiper-pagination"></div>
          <div className="swiper-button-prev"></div>
          <div className="swiper-button-next"></div>
        </div>
      </div>

      {/* Modal */}
      {modalPhotos && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalPhotos(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-neutral-700">
                {modalPhotos.length} {modalPhotos.length === 1 ? 'Photo' : 'Photos'}
              </p>
              <button
                onClick={() => setModalPhotos(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {modalPhotos.map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  alt={`Client wedding photo ${i + 1} – Fotokaran Studio Tirunelveli`}
                  loading="lazy"
                  className="w-full aspect-square object-cover rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Clients;
