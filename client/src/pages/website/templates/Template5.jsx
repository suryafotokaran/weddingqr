import { useEffect, useRef } from 'react';

/**
 * Template5 — Tamil Nadu Temple
 * Deep crimson & gold with temple background, kolam decorations and Cinzel headings.
 * Renders template5.html in an iframe, injects live data via postMessage.
 */
export default function Template5({ data }) {
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
      src="/templates/template5.html"
      title="Template 5 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
