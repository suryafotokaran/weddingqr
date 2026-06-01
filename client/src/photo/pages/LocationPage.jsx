import { Helmet } from 'react-helmet-async';
import PhotoHomePage from '../PhotoHomePage';

const LocationPage = ({ city, district }) => {
  const districtLabel = district === 'Kanyakumari' ? 'Kanyakumari District' : 'Tirunelveli District';
  const slug = city.toLowerCase().replace(/\s+/g, '-');

  const title = `Fotokaran Studio | Best Photo Studio in ${city} | Wedding Photographer ${city}`;
  const description = `Fotokaran Studio – Best photo studio serving ${city}, ${districtLabel}. Professional wedding, candid & pre-wedding photography. Capturing your precious moments in ${city} and nearby areas. Call: 8489193088`;
  const canonical = `https://www.fotokaranstudio.com/${slug}`;

  const keywords = [
    `best photo studio in ${city}`,
    `best photography studio ${city}`,
    `wedding photographer ${city}`,
    `candid photographer ${city}`,
    `pre-wedding photography ${city}`,
    `best photographer in ${city}`,
    `${city} wedding photography`,
    `${city} photo studio`,
    `photography studio near ${city}`,
    `wedding photos ${city}`,
    `Fotokaran Studio ${city}`,
    `best photo studio ${districtLabel}`,
    `best wedding photographer Tirunelveli`,
    `best photo studio in tirunelveli`,
  ].join(', ');

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.fotokaranstudio.com/fotokaran-logo.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": ["LocalBusiness", "PhotographyBusiness"],
          "name": "Fotokaran Studio",
          "image": "https://www.fotokaranstudio.com/fotokaran-logo.png",
          "description": description,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Veeravanallur",
            "addressLocality": "Tirunelveli",
            "addressRegion": "Tamil Nadu",
            "postalCode": "627426",
            "addressCountry": "IN"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 8.690439,
            "longitude": 77.522127
          },
          "url": "https://www.fotokaranstudio.com/",
          "telephone": "+918489193088",
          "areaServed": { "@type": "City", "name": city },
        })}</script>
      </Helmet>
      <PhotoHomePage locationCity={city} />
    </>
  );
};

export default LocationPage;
