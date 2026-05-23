import { useEffect, useRef } from 'react';

/**
 * Template1 — Classic Gold
 * Renders the static template1.html in an iframe and injects live `data`
 * via postMessage so every field update reflects instantly without a reload.
 */
export default function Template1({ data }) {
  const iframeRef = useRef(null);

  const sendData = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'UPDATE_DATA', data },
        '*'
      );
    } catch (_) {}
  };

  // Re-send whenever data changes
  useEffect(() => {
    sendData();
  }, [data]);

  return (
    <iframe
      ref={iframeRef}
      src="/templates/template1.html"
      title="Template 1 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
