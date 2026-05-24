import React, { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { uiAssets } from "../../assets/imageConfig.js";

const FloatingButtons = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 768);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleWhatsAppClick = () => {
    const url = `https://wa.me/919597230737?text=${encodeURIComponent("Hello! I'm interested in your photography services.")}`;
    window.open(url, "_blank");
  };

  const handleInstagramClick = () => {
    window.open(
      "https://www.instagram.com/filmfactory_studios/?igsh=MWY5NHNzZHE5MXhoaw%3D%3D&utm_source=qr#",
      "_blank"
    );
  };

  const handlePhoneClick = () => {
    window.location.href = "tel:+919597230737";
  };

  const size = isMobile ? "45px" : "50px";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "15px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={handlePhoneClick}
        style={{
          width: size,
          height: size,
          backgroundColor: "#25d366",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 15px rgba(37, 211, 102, 0.3)",
        }}
      >
        <Phone size={isMobile ? 20 : 24} color="white" />
      </div>

      <img
        src={uiAssets.instagram}
        alt="Instagram"
        onClick={handleInstagramClick}
        style={{ width: size, height: size, cursor: "pointer", borderRadius: "10px" }}
      />

      <img
        src={uiAssets.whatsapp}
        alt="WhatsApp"
        onClick={handleWhatsAppClick}
        style={{
          width: isMobile ? "45px" : "60px",
          height: isMobile ? "45px" : "60px",
          cursor: "pointer",
          borderRadius: "10px",
        }}
      />
    </div>
  );
};

export default FloatingButtons;
