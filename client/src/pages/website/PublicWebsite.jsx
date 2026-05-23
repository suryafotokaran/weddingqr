import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TemplateRenderer from './TemplateRenderer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicWebsite() {
  const { eventId } = useParams(); // can be UUID or slug
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = null;
      try {
        if (UUID_RE.test(eventId)) {
          // UUID path
          const res = await supabase.from('website_configs').select('*').eq('event_id', eventId).single();
          data = res.data;
        } else {
          // Slug path — try slug first, fall back to nothing (slug col may not exist yet)
          const res = await supabase.from('website_configs').select('*').eq('slug', eventId).single();
          if (res.error) {
            // slug column may not exist yet — surface as unpublished
            data = null;
          } else {
            data = res.data;
          }
        }
      } catch (_) { data = null; }
      if (!cancelled) { setConfig(data); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) {
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#888' }}>
        Loading…
      </div>
    );
  }

  if (!config || !config.is_published) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'serif',color:'#4A2E1A',textAlign:'center',padding:'24px' }}>
        <div style={{ fontSize:'48px',marginBottom:'16px' }}>🌸</div>
        <h1 style={{ fontSize:'28px',fontWeight:'400',marginBottom:'8px' }}>Coming Soon</h1>
        <p style={{ fontSize:'14px',color:'#888' }}>This wedding website hasn't been published yet.</p>
      </div>
    );
  }

  return (
    <div style={{ width:'100%',height:'100vh' }}>
      <TemplateRenderer templateId={config.template_id} data={config.data} />
    </div>
  );
}
