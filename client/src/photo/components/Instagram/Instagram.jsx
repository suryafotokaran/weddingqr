import React from "react";
import { Phone } from "lucide-react";
import { uiAssets } from "../../assets/imageConfig.js";
import { usePhoto } from "../../context/PhotoContext";
import MapIframe from "../MapFrame";

const Instagram = () => {
  const { galleryPhotos, siteContent } = usePhoto();
  const contact = siteContent.contact || {};
  const social  = siteContent.social  || {};

  const address  = contact.address  || "V.P Theivam complex, 61/C, Tirupparankunram Rd, Vasanth Nagar, Madurai, Tamil Nadu 625003";
  const phone    = contact.phone    || "+91 95972 30737";
  const email    = contact.email    || "filmfactorystudios23@gmail.com";
  const whatsapp = contact.whatsapp || "919597230737";
  const mapsUrl  = contact.maps_url || "https://maps.app.goo.gl/KR8FtYPRa4eyB9ca6";

  return (
    <section className="max-w-[1200px] mx-auto py-20 px-4 overflow-hidden">
      <h2
        className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
        style={{ fontFamily: "Merriweather, serif" }}
      >
        ~ INSTAGRAM ~
      </h2>

      <div className="instagram__flex">
        {galleryPhotos.map((photo) => (
          <img
            key={photo.id}
            src={photo.url}
            alt="instagram"
            loading="lazy"
            style={{ width: "135px", height: "200px", objectFit: "cover", borderRadius: "8px" }}
          />
        ))}
      </div>

      <div className="pt-[50px]" id="contact">
        <h2
          className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
          style={{ fontFamily: "Merriweather, serif" }}
        >
          ~ CONTACT ~
        </h2>

        <div className="mt-12 grid gap-12 grid-cols-1 md:grid-cols-[1.2fr_1fr] items-stretch">
          <div className="relative w-full min-h-[300px]">
            <MapIframe />
            <button
              className="absolute bottom-[10px] left-1/2 -translate-x-1/2 text-xs px-[14px] py-[10px] bg-white text-black border-none rounded-lg cursor-pointer flex items-center gap-2 shadow-md hover:-translate-y-0.5 transition-transform duration-300"
              onClick={() => window.open(mapsUrl, "_blank")}
            >
              Get Direction <img src={uiAssets.mapbutton} alt="" className="max-w-[14px] h-auto" />
            </button>
          </div>

          <div className="bg-[rgba(60,60,60,0.95)] backdrop-blur-xl rounded-[20px] md:rounded-[30px] p-6 md:p-10 text-white shadow-[0_15px_40px_rgba(0,0,0,0.2)] w-full max-w-[500px] mx-auto md:mx-0">
            <h2 className="text-[1.8rem] md:text-[2.5rem] font-light mb-6 text-white tracking-wide text-center">
              Contact Info
            </h2>
            <div className="flex flex-col gap-5 md:gap-7 mb-6">
              <div className="flex items-start gap-4">
                <i className="ri-map-pin-line text-[1.3rem] md:text-[1.8rem] text-white w-[30px] md:w-[40px] flex-shrink-0 mt-1"></i>
                <span className="text-white text-sm md:text-[1.1rem] leading-relaxed font-light">{address}</span>
              </div>
              <div className="flex items-center gap-4">
                <i className="ri-phone-line text-[1.3rem] md:text-[1.8rem] text-white w-[30px] md:w-[40px] flex-shrink-0"></i>
                <span className="text-white text-sm md:text-[1.1rem] leading-relaxed font-light">{phone}</span>
              </div>
              <div className="flex items-center gap-4">
                <i className="ri-mail-line text-[1.3rem] md:text-[1.8rem] text-white w-[30px] md:w-[40px] flex-shrink-0"></i>
                <span className="text-white text-sm md:text-[1.1rem] leading-relaxed font-light">{email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center my-8">
          <button
            className="flex items-center gap-3 bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white border-none rounded-[50px] py-4 px-8 text-[1.1rem] font-semibold cursor-pointer shadow-[0_8px_25px_rgba(37,211,102,0.3)] hover:from-[#128c7e] hover:to-[#25d366] hover:-translate-y-1 transition-all duration-300"
            onClick={() => window.location.href = `tel:${whatsapp}`}
          >
            <Phone size={24} style={{ animation: "phoneRing 1.5s ease-in-out infinite" }} />
            <span>Call Now</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Instagram;
