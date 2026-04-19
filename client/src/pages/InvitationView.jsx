import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTemplate } from '../invitations/index.js';
import { s3Client } from '../lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_BUCKET = import.meta.env.VITE_R2_BUCKET;

async function signPath(storagePath) {
  if (!storagePath) return null;
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath });
    return await getSignedUrl(s3Client, cmd, { expiresIn: 3600 });
  } catch {
    return null;
  }
}

async function resolveSignedUrls(cfg) {
  const resolved = {};
  for (const field of ['groomPhoto', 'bridePhoto', 'heroPhoto']) {
    const stored = cfg[field];
    if (stored?.path) resolved[field] = await signPath(stored.path);
    else if (stored?.url) resolved[field] = stored.url;
  }
  if (Array.isArray(cfg.galleries)) {
    resolved.galleries = await Promise.all(
      cfg.galleries.map(async (g) => ({
        ...g,
        url: g.path ? await signPath(g.path) : g.url,
      }))
    );
  }
  return resolved;
}

/**
 * InvitationView — public, no auth required
 * Route: /invite/:id
 *
 * Fetches invitation_config from the events table and renders
 * the chosen template with the saved data.
 */
export default function InvitationView() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-found'
  const [templateData, setTemplateData] = useState(null);
  const [TemplateComponent, setTemplateComponent] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: ev, error } = await supabase
        .from('events')
        .select('invitation_config, name')
        .eq('id', id)
        .single();

      if (error || !ev?.invitation_config) {
        setStatus('not-found');
        return;
      }

      let cfg = ev.invitation_config;
      
      // NEW: Read from the 'published' key if it exists (Drafts/Published flow)
      // Fallback to the whole object for legacy invitations
      if (cfg.published) {
        cfg = cfg.published;
      }
      
      // Resolve signed GET URLs for R2 paths
      const resolvedPhotos = await resolveSignedUrls(cfg);

      const tData = {
        ...cfg,
        ...resolvedPhotos,
        hiddenSections: new Set(Array.isArray(cfg.hiddenSections) ? cfg.hiddenSections : []),
      };

      const tpl = getTemplate(cfg.templateId || 'golden-royal');
      setTemplateComponent(() => tpl.component);
      setTemplateData(tData);
      setStatus('ready');

      // Set page title
      if (ev.name) document.title = `${ev.name} — Wedding Invitation`;
    };
    load();
  }, [id]);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#080200', color:'#f5a623',
        fontFamily:"'Cormorant Garamond', Georgia, serif",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital@1&display=swap'); @keyframes inv-pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
        <div style={{ fontSize:'56px', animation:'inv-pulse 2s ease-in-out infinite' }}>ॐ</div>
        <p style={{ marginTop:'20px', fontSize:'14px', letterSpacing:'.3em', textTransform:'uppercase', color:'rgba(245,166,35,.6)' }}>Loading invitation…</p>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'#080200', color:'#e8d5a3',
        fontFamily:"'Cormorant Garamond', Georgia, serif",
        textAlign:'center', padding:'40px',
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Cormorant+Garamond&display=swap');`}</style>
        <div style={{ fontSize:'48px', marginBottom:'24px', color:'rgba(245,166,35,.4)' }}>✦</div>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'32px', color:'#f5a623', marginBottom:'12px' }}>Invitation Not Found</h1>
        <p style={{ color:'rgba(232,213,163,.5)', fontSize:'15px' }}>This invitation link may be invalid or the event has not published their web invitation yet.</p>
      </div>
    );
  }

  return <TemplateComponent data={templateData} />;
}
