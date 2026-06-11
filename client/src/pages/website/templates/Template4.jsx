import { useEffect, useRef } from 'react';

/**
 * Template4 — Bhavishy (Lantern & Floral)
 * Rich dark tones with floating lanterns, floral event cards and gallery slider.
 * Renders template4.html in an iframe, injects live data via postMessage.
 */
export default function Template4({ data }) {
  const iframeRef = useRef(null);

  const sendData = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'UPDATE_DATA', data },
        '*'
      );
    } catch (_) {}
  };

  useEffect(() => {
    sendData();
  }, [data]);

  return (
    <iframe
      ref={iframeRef}
      src="/templates/template4.html"
      title="Template 4 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
