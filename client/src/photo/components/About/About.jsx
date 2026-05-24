import React from "react";
import { uiAssets } from "../../assets/imageConfig.js";
import { usePhoto } from "../../context/PhotoContext";

const About = () => {
  const { siteContent } = usePhoto();
  const about = siteContent.about || {};

  const title = about.title || "WE CAPTURE THE MOMENTS";
  const desc1 = about.description_1 || "At Capturer, we specialize in freezing those fleeting moments in time that hold immense significance for you. With our passion for photography and keen eye for detail, we transform ordinary moments into extraordinary memories.";
  const desc2 = about.description_2 || "Whether it's a milestone event, capturing precious child moments, or the breathtaking beauty of nature, we strive to encapsulate the essence of every moment.";

  return (
    <div className="max-w-[1200px] mx-auto py-20 px-4" id="about">
      <h2
        className="mb-4 text-[2rem] font-normal text-neutral-900 text-center"
        style={{ fontFamily: "Merriweather, serif" }}
      >
        {title}
      </h2>
      <p className="text-neutral-500 leading-7 text-center max-w-[900px] mx-auto mb-4">{desc1}</p>
      <p className="text-neutral-500 leading-7 text-center max-w-[900px] mx-auto mb-8">{desc2}</p>
      <img
        src={uiAssets.logo}
        alt="logo"
        className="max-w-[170px] mx-auto"
        style={{ borderRadius: "50%", width: "200px", height: "100px", objectFit: "cover" }}
      />
    </div>
  );
};

export default About;
