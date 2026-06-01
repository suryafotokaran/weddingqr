import React from "react";
import { useNavigate } from "react-router-dom";
import { usePhoto } from "../../context/PhotoContext";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const Portfolio = () => {
  const navigate = useNavigate();
  const { portfolios, loadingPortfolios: loading } = usePhoto();

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto py-20 px-4">
        <h2
          className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
          style={{ fontFamily: "Merriweather, serif" }}
        >
          ~ PORTFOLIO ~
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <SkeletonTheme baseColor="#ebebeb" highlightColor="#f5f5f5">
            {[1, 2, 3].map((index) => (
              <div key={index} className="portfolio__card">
                <Skeleton height={450} style={{ borderRadius: "10px" }} />
                <div className="portfolio__content">
                  <Skeleton height={40} width="60%" style={{ borderRadius: "4px", margin: "20px auto" }} />
                </div>
              </div>
            ))}
          </SkeletonTheme>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-20 px-4">
      <h2
        className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
        style={{ fontFamily: "Merriweather, serif" }}
      >
        ~ PORTFOLIO ~
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {portfolios.map((portfolio) => (
          <div
            key={portfolio.id}
            className="portfolio__card"
            style={{ "--category-name": `"${portfolio.name}"` }}
          >
            <img src={portfolio.cover_url} alt={`${portfolio.name} photography in Tirunelveli – Fotokaran Studio`} loading="lazy" />
            <div className="portfolio__content">
              <button
                className="py-3 px-6 text-base font-medium text-white bg-neutral-900 rounded-md border-none outline-none cursor-pointer hover:bg-neutral-600 transition-colors duration-300"
                onClick={() => navigate(`/portfolio/${portfolio.id}`)}
              >
                VIEW {portfolio.name.toUpperCase()}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Portfolio;
