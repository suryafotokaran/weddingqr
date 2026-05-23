import { useEffect, useRef } from 'react';

/**
 * Template2 — Emerald & Gold
 * Deep emerald with Islamic geometric patterns, stars & lanterns.
 * Renders template2.html in an iframe, injects live data via postMessage.
 */
export default function Template2({ data }) {
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
      src="/templates/template2.html"
      title="Template 2 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
