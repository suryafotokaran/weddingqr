import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { uiAssets } from "../../assets/imageConfig.js";
import { usePhoto } from "../../context/PhotoContext";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const Header = ({ locationCity }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const { desktopBanners, mobileBanners, loadingBanners: loading } = usePhoto();

  const currentSliderImages = isMobile ? mobileBanners : desktopBanners;
  const bannerImages = currentSliderImages.map(img => img.url);

  const isHomePage = location.pathname === "/";

  useEffect(() => {
    if (bannerImages.length <= 1) return;
    setProgress(0);
    let prog = 0;
    const progressInterval = setInterval(() => {
      prog += 100 / 30;
      if (prog >= 100) {
        prog = 0;
        setProgress(0);
        setCurrentImage(c => (c + 1) % bannerImages.length);
      } else {
        setProgress(prog);
      }
    }, 100);
    return () => clearInterval(progressInterval);
  }, [currentImage, bannerImages.length]);

  useEffect(() => {
    const checkScreenSize = () => {
      const newIsMobile = window.innerWidth <= 768;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        setCurrentImage(0);
        setProgress(0);
      }
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isMobile]);

  const handleIndicatorClick = (index) => {
    setCurrentImage(index);
    setProgress(0);
  };

  return (
    <header className="bg-white relative overflow-hidden" id="home" style={{ minHeight: "100vh" }}>
      {loading && (
        <div className="absolute inset-0">
          <SkeletonTheme baseColor="#e0e0e0" highlightColor="#f0f0f0">
            <Skeleton height="100vh" style={{ borderRadius: 0 }} />
          </SkeletonTheme>
        </div>
      )}

      {!loading &&
        bannerImages.map((img, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `radial-gradient(rgba(255,255,255,0), rgba(0,0,0,0.9)), url(${img})`,
              backgroundPosition: "center center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              opacity: currentImage === index ? 1 : 0,
            }}
          />
        ))}

      {!loading && bannerImages.length > 1 && (
        <div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex z-20"
          style={{ gap: "15px" }}
        >
          {bannerImages.map((_, index) => (
            <button
              key={index}
              className="relative w-12 h-1 bg-white/30 rounded-full overflow-hidden"
              onClick={() => handleIndicatorClick(index)}
            >
              <div
                className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100"
                style={{ width: currentImage === index ? `${progress}%` : "0%" }}
              />
            </button>
          ))}
        </div>
      )}

      {locationCity && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          style={{ paddingTop: "120px" }}
        >
          <div className="text-center px-6 max-w-3xl">
            <h1
              style={{
                fontFamily: "Merriweather, serif",
                color: "#fff",
                fontSize: "clamp(1.4rem, 3.5vw, 2.5rem)",
                fontWeight: 700,
                lineHeight: 1.35,
                textShadow: "0 2px 12px rgba(0,0,0,0.7)",
                margin: 0,
              }}
            >
              Professional Wedding &amp; Candid Photography Studio in {locationCity}
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
                marginTop: "14px",
                fontFamily: "Montserrat, sans-serif",
                textShadow: "0 1px 6px rgba(0,0,0,0.6)",
              }}
            >
              Serving {locationCity} &amp; nearby areas · Call: 8489193088
            </p>
          </div>
        </div>
      )}

      <nav className="relative z-10">
        <div className="nav__header">
          <div className="nav__logo">
            <a href="#">
              <img
                src={uiAssets.logo}
                alt="logo"
                style={{
                  borderRadius: "50%",
                  width: isMobile ? "40px" : "100px",
                  height: isMobile ? "40px" : "100px",
                  objectFit: "cover",
                }}
              />
            </a>
          </div>
          <div className="nav__menu__btn" id="menu-btn">
            <i className="ri-menu-line"></i>
          </div>
        </div>
        <ul className="nav__links" id="nav-links">
          <li>{isHomePage ? <a href="#home">HOME</a> : <Link to="/">HOME</Link>}</li>
          <li>{isHomePage ? <a href="#about">ABOUT US</a> : <Link to="/#about">ABOUT US</Link>}</li>
          <li>{isHomePage ? <a href="#service">SERVICES</a> : <Link to="/#service">SERVICES</Link>}</li>
          <li className="nav__logo">
            <Link to="/">
              <img
                src={uiAssets.logo}
                alt="logo"
                style={{
                  borderRadius: "50%",
                  width: isMobile ? "40px" : "100px",
                  height: isMobile ? "40px" : "100px",
                  objectFit: "cover",
                }}
              />
            </Link>
          </li>
          <li>
            {isHomePage ? (
              <a href="#client">TESTIMONIAL</a>
            ) : (
              <Link to="/#client">TESTIMONIAL</Link>
            )}
          </li>
          <li>
            {isHomePage ? (
              <a href="#contact">CONTACT US</a>
            ) : (
              <Link to="/#contact">CONTACT US</Link>
            )}
          </li>
          <li>
            <Link
              to="/signin"
              style={{
                padding: "6px 18px",
                border: "2px solid white",
                borderRadius: "4px",
                fontWeight: 600,
                color: "white",
                letterSpacing: "0.5px",
              }}
            >
              SIGN IN
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
