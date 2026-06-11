import { useEffect, useRef } from 'react';

/**
 * Template 10 — Blossomoud Modern Theme
 * Desert pastel elements, canvas-blended video entrance, and floating backdrop loops.
 * Renders template10.html in an iframe, injects live data via postMessage.
 */
export default function Template10({ data }) {
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
      src="/templates/template10.html"
      title="Template 10 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
