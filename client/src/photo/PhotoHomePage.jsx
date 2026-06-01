import React, { useEffect } from "react";
import Header from "./components/Header/Header";
import Portfolio from "./components/Portfolio/Portfolio";
import Gallery from "./components/Gallery/Gallery";
import Clients from "./components/Clients/Clients";
import About from "./components/About/About";
import Services from "./components/Services/Services";
import Instagram from "./components/Instagram/Instagram";
import Footer from "./components/Footer/Footer";
import "./photo.css";

const PhotoHomePage = ({ locationCity }) => {
  useEffect(() => {
    const menuBtn = document.getElementById("menu-btn");
    const navLinks = document.getElementById("nav-links");
    const menuBtnIcon = menuBtn?.querySelector("i");

    const handleMenuClick = () => {
      navLinks.classList.toggle("open");
      const isOpen = navLinks.classList.contains("open");
      menuBtnIcon?.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
    };

    const handleNavLinksClick = () => {
      navLinks.classList.remove("open");
      menuBtnIcon?.setAttribute("class", "ri-menu-line");
    };

    if (menuBtn && navLinks) {
      menuBtn.addEventListener("click", handleMenuClick);
      navLinks.addEventListener("click", handleNavLinksClick);
    }

    if (typeof window !== "undefined" && window.ScrollReveal) {
      const sr = window.ScrollReveal({ distance: "50px", origin: "bottom", duration: 1000 });
      sr.reveal("#about h2");
      sr.reveal("#about p", { delay: 500, interval: 500 });
      sr.reveal("#about img", { delay: 1500 });
    }

    const instagram = document.querySelector(".instagram__flex");
    if (instagram && instagram.children.length > 0) {
      Array.from(instagram.children).forEach((item) => {
        const dup = item.cloneNode(true);
        dup.setAttribute("aria-hidden", true);
        instagram.appendChild(dup);
      });
    }

    return () => {
      if (menuBtn && navLinks) {
        menuBtn.removeEventListener("click", handleMenuClick);
        navLinks.removeEventListener("click", handleNavLinksClick);
      }
    };
  }, []);

  return (
    <>
      <Header locationCity={locationCity} />
      <Portfolio />
      <Gallery />
      <Clients />
      <About />
      <Services />
      <Instagram />
      <Footer />
    </>
  );
};

export default PhotoHomePage;
