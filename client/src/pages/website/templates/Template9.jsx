import { useEffect, useRef } from 'react';

/**
 * Template 9 — Light design replicated UI
 * Elegant floral/shape backdrop, custom popup splash trigger, timeline schedule, and countdown timer.
 * Renders template9.html in an iframe, injects live data via postMessage.
 */
export default function Template9({ data }) {
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
      src="/templates/template9.html"
      title="Template 9 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
