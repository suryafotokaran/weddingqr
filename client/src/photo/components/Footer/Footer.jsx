import React from "react";
import { uiAssets } from "../../assets/imageConfig.js";
import { usePhoto } from "../../context/PhotoContext";

const Footer = () => {
  const { siteContent } = usePhoto();
  const footer = siteContent.footer  || {};
  const social = siteContent.social  || {};

  const businessName  = footer.business_name || "Fotokaran Studio";
  const stayInTouch   = footer.stay_in_touch || "Keep up-to-date with all things Fotokaran! Join our community and never miss a moment!";
  const copyright     = footer.copyright     || "Copyright © 2025 Fotokaran Studio. All rights reserved.";
  const facebookUrl   = social.facebook      || "#";
  const instagramUrl  = social.instagram     || "https://www.instagram.com/fotokaranstudio/";

  return (
    <footer>
      <div className="max-w-[1200px] mx-auto py-20 px-4 grid gap-16 sm:grid-cols-2 md:grid-cols-3 items-center">
        <div className="px-8 sm:col-span-2 md:col-span-1 md:order-2 border-x-0 md:border-x-2 md:border-neutral-900">
          <img
            src={uiAssets.logo}
            alt="logo"
            className="max-w-[170px] mx-auto mb-8 rounded-full"
            style={{ width: "100px", height: "100px", objectFit: "cover" }}
          />
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-2xl text-neutral-900 hover:text-neutral-500">
              <i className="ri-facebook-fill"></i>
            </a>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-2xl text-neutral-900 hover:text-neutral-500">
              <i className="ri-instagram-line"></i>
            </a>
          </div>
        </div>

        <div className="px-8 md:order-1">
          <ul className="list-none grid grid-cols-2 gap-8">
            {["HOME","ABOUT US","SERVICES","TESTIMONIAL","CONTACT US"].map((label, i) => {
              const hrefs = ["#home","#about","#service","#client","#contact"];
              return <li key={i}><a href={hrefs[i]} className="block font-semibold text-neutral-900 text-center hover:text-neutral-500">{label}</a></li>;
            })}
          </ul>
        </div>

        <div className="px-8 md:order-3">
          <h4 className="mb-4 text-[1.2rem] font-semibold text-neutral-900 text-center">STAY IN TOUCH</h4>
          <p className="text-neutral-600 leading-7 text-center">{stayInTouch}</p>
        </div>
      </div>
      <div className="py-4 px-4 text-sm text-neutral-400 bg-neutral-900 text-center">{copyright}</div>
      <div className="py-2 px-4 text-xs text-neutral-600 bg-neutral-900 text-center border-t border-neutral-800">
        Developed & Designed by{" "}
        <a
          href="https://wa.me/917200362436"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 font-medium hover:text-green-400 transition-colors"
        >
          Arjunan
        </a>
      </div>
    </footer>
  );
};

export default Footer;
