import { useEffect, useRef } from 'react';

/**
 * Template8 — Dark Navy & Gold
 * Inspired by template2.tilda.ws — dark navy + champagne gold palette,
 * Playfair Display serif, elegant event timeline and blush venue cards.
 * Renders template8.html in an iframe, injects live data via postMessage.
 */
export default function Template8({ data }) {
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
      src="/templates/template8.html"
      title="Template 8 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
