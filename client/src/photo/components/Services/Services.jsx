import React from "react";
import { usePhoto } from "../../context/PhotoContext";

const Services = () => {
  const { services, loadingServices } = usePhoto();

  if (loadingServices) return null;

  if (services.length === 0) return null;

  return (
    <section className="service" id="service">
      <div className="max-w-[1200px] mx-auto py-20 px-4">
        <h2
          className="mb-4 text-[2rem] font-normal text-white text-center"
          style={{ fontFamily: "Merriweather, serif" }}
        >
          ~ SERVICES ~
        </h2>
        <p className="text-neutral-400 leading-7 text-center max-w-[600px] mx-auto">
          At Fotokaran Studio, we offer a range of professional photography services tailored to meet your unique needs.
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className="text-center">
              <h4
                className="relative mb-4 pb-4 text-[1.75rem] font-normal text-white after:absolute after:content-['~'] after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:text-[2rem] after:leading-none"
                style={{ fontFamily: "Merriweather, serif" }}
              >
                {s.title}
              </h4>
              <p className="text-neutral-400 leading-7">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
