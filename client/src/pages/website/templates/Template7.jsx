import { useEffect, useRef } from 'react';

/**
 * Template7 — Viktor & Paula Modern
 * Elegant burgundy Tilda-based template with sticky dynamic category navigation.
 * Renders template7.html in an iframe, injects live data via postMessage.
 */
export default function Template7({ data }) {
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
      src="/templates/template7.html"
      title="Template 7 Preview"
      onLoad={sendData}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
