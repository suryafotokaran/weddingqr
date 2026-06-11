import { useEffect, useRef } from 'react';

/**
 * Template 6 — Jathu & Thanu replicated UI
 * Elegant floral backdrop, custom countdown timer, and grid-based absolute timeline details.
 * Renders template6.html in an iframe, injects live data via postMessage.
 */
export default function Template6({ data }) {
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
      src="/templates/template6.html"
      title="Template 6 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
