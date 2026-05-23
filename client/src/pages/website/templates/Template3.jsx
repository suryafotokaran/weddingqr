import { useEffect, useRef } from 'react';

/**
 * Template3 — Sacred Temple Night
 * Deep midnight with marigold flames, temple shikhara & Vedic aesthetics.
 * Renders template3.html in an iframe, injects live data via postMessage.
 */
export default function Template3({ data }) {
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
      src="/templates/template3.html"
      title="Template 3 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
