import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import Toast from '../components/Toast';
import { TEMPLATES } from '../invitations/index.js';
import {
  ArrowLeft, Globe, Copy, Check, Eye, EyeOff,
  Loader2, ChevronDown, ChevronUp, ImageIcon, Trash2,
  Link2, Layout, Palette, RefreshCw, Laptop, Smartphone,
  Info,
} from 'lucide-react';
import { s3Client, uploadToR2 } from '../lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import imageCompression from 'browser-image-compression';

const R2_BUCKET = import.meta.env.VITE_R2_BUCKET;

/* ─── Field Classification ──────────────────────────────────── */
const SHARED_FIELDS = [
  'groomName', 'brideName', 'groomFatherName', 'brideFatherName',
  'groomDesc', 'brideDesc', 'weddingDate', 'venueName', 'venueAddress',
  'rsvpPhone1', 'rsvpPhone2'
];

async function signPath(storagePath) {
  if (!storagePath) return null;
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath });
    return await getSignedUrl(s3Client, cmd, { expiresIn: 3600 });
  } catch {
    return null;
  }
}

async function buildSignedUrls(cfg) {
  const out = {};
  for (const field of ['groomPhoto', 'bridePhoto', 'heroPhoto']) {
    const stored = cfg[field];
    if (stored?.path) out[field] = await signPath(stored.path);
    else if (stored?.url) out[field] = stored.url;
  }
  if (Array.isArray(cfg.galleries)) {
    out.galleries = await Promise.all(
      cfg.galleries.map(async (g) => ({
        ...g,
        url: g.path ? await signPath(g.path) : g.url,
      }))
    );
  }
  return out;
}

const ALL_SECTIONS = [
  { key: 'hero',      label: 'Hero / Title',    icon: '🏠' },
  { key: 'countdown', label: 'Countdown Timer', icon: '⏳' },
  { key: 'couple',    label: 'Couple Story',    icon: '💑' },
  { key: 'events',    label: 'Wedding Events',  icon: '🎊' },
  { key: 'quote',     label: 'Quote Divider',   icon: '💬' },
  { key: 'gallery',   label: 'Photo Gallery',   icon: '🖼️' },
  { key: 'rsvp',      label: 'RSVP Form',       icon: '📋' },
];

function defaultData() {
  return {
    templateId:     'golden-royal',
    groomName:      'Groom Name',
    brideName:      'Bride Name',
    groomFatherName:'Mr. & Mrs. Father Name',
    brideFatherName:'Mr. & Mrs. Father Name',
    groomDesc:      'A short description about the groom.',
    brideDesc:      'A short description about the bride.',
    weddingDate:    new Date(Date.now() + 60*24*3600*1000).toISOString().slice(0,16),
    venueName:      'Venue Name',
    venueAddress:   'Venue full address',
    groomPhoto:     null,
    bridePhoto:     null,
    heroPhoto:      null,
    rsvpPhone1:     '+91 98765 43210',
    rsvpPhone2:     '+91 91234 56780',
    galleries:      [],
    events:         [],
    hiddenSections: [],
  };
}

function Accordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:'1px solid #e4e4e7',borderRadius:'12px',overflow:'hidden',marginBottom:'12px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'#fafafa',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',color:'#18181b' }}
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div style={{ padding:'16px',background:'#fff' }}>{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', rows, placeholder, isShared }) {
  const style = { width:'100%',padding:'10px 12px',border:'1px solid #e4e4e7',borderRadius:'8px',fontSize:'13px',color:'#18181b',background:'#fff',outline:'none',fontFamily:'inherit' };
  return (
    <div style={{ marginBottom:'14px' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px' }}>
        <label style={{ display:'block',fontSize:'11px',fontWeight:700,color:'#71717a',textTransform:'uppercase',letterSpacing:'.05em' }}>{label}</label>
        {isShared && (
          <div title="Applied to all templates" style={{ display:'flex',alignItems:'center',gap:'3px',fontSize:'9px',color:'#0f766e',fontWeight:700,background:'#f0fdf4',padding:'2px 6px',borderRadius:'4px' }}>
             <Globe size={9} /> SHARED
          </div>
        )}
      </div>
      {rows
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...style,resize:'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      }
    </div>
  );
}

function PhotoField({ label, previewUrl, storedUrl, onUrlChange, onUpload, onClear, isUploading }) {
  const inputRef = useRef(null);
  return (
    <div style={{ marginBottom:'14px' }}>
      <label style={{ display:'block',fontSize:'11px',fontWeight:700,color:'#71717a',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'6px' }}>{label}</label>
      <div style={{ display:'flex',gap:'10px',alignItems:'center' }}>
        {previewUrl
          ? <img src={previewUrl} alt={label} style={{ width:'52px',height:'52px',borderRadius:'10px',objectFit:'cover',border:'2px solid #e4e4e7',flexShrink:0 }} />
          : <div style={{ width:'52px',height:'52px',borderRadius:'10px',background:'#f4f4f5',display:'flex',alignItems:'center',justifyContent:'center',border:'2px dashed #d4d4d8',flexShrink:0 }}><ImageIcon size={18} color="#a1a1aa" /></div>
        }
        <div style={{ flex:1 }}>
          <input
            type="url"
            value={storedUrl || ''}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="Paste image URL..."
            style={{ width:'100%',padding:'8px 10px',border:'1px solid #e4e4e7',borderRadius:'8px',fontSize:'12px',marginBottom:'6px' }}
          />
          <button onClick={() => inputRef.current?.click()} disabled={isUploading}
            style={{ fontSize:'11px',fontWeight:700,color:'#0f766e',background:'none',border:'none',cursor:'pointer',padding:0 }}>
            {isUploading ? '⏳ Uploading...' : '⬆ Upload from device (R2)'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value=''; }} />
        </div>
        {(previewUrl || storedUrl) && (
          <button onClick={onClear} style={{ background:'none',border:'none',cursor:'pointer',color:'#71717a',padding:'4px',flexShrink:0 }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function WebInvitation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [event, setEvent] = useState(null);
  const [dbConfig, setDbConfig] = useState({ published: null, drafts: {}, activeDraftId: 'golden-royal' });
  const [invData, setInvData] = useState(defaultData());
  const [signedUrls, setSignedUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [activePanel, setActivePanel] = useState('design');
  const [uploadingField, setUploadingField] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState('desktop'); // 'desktop' | 'mobile'

  const saveTimerRef = useRef(null);
  const publicLink = `${window.location.origin}/invite/${id}`;

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Auto-save (debounced) ─────────────────────────────── */
  const persistToDB = useCallback(async (currentContainer) => {
    setSaving(true);
    const { error } = await supabase.from('events').update({
      invitation_config: currentContainer
    }).eq('id', id);
    if (error) console.error('Auto-save error:', error);
    setSaving(false);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
      setEvent(ev);

      let raw = ev?.invitation_config || {};
      let migrated = { published: null, drafts: {}, activeDraftId: 'golden-royal' };

      if (raw.groomName && !raw.drafts) {
        migrated.published = { ...raw };
        migrated.drafts = { [raw.templateId || 'golden-royal']: { ...raw } };
        migrated.activeDraftId = raw.templateId || 'golden-royal';
      } else if (raw.drafts) {
        migrated = { ...migrated, ...raw };
      } else if (ev) {
        const def = defaultData();
        const init = {
          ...def,
          weddingDate: ev.date ? new Date(ev.date).toISOString().slice(0,16) : def.weddingDate,
          groomName: ev.name?.split('&')[0]?.trim() || def.groomName,
          brideName: ev.name?.split('&')[1]?.trim() || def.brideName,
        };
        migrated.drafts = { [init.templateId]: init };
        migrated.activeDraftId = init.templateId;
      }

      setDbConfig(migrated);
      const activeId = migrated.activeDraftId || 'golden-royal';
      const activeData = migrated.drafts[activeId] || defaultData();
      
      setInvData(activeData);
      const resolved = await buildSignedUrls(activeData);
      setSignedUrls(resolved);
      setLoading(false);
    };
    load();
  }, [id]);

  /* ── Update Data with Shared logic ──────────────────────── */
  const updateData = useCallback((patch) => {
    setInvData(prev => {
      const next = { ...prev, ...patch };
      
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setDbConfig(curr => {
          let updatedDrafts = { ...curr.drafts, [next.templateId]: next };
          
          // Apply field synchronization if it's a shared field
          const keys = Object.keys(patch);
          const hasShared = keys.some(k => SHARED_FIELDS.includes(k));

          if (hasShared) {
            Object.keys(updatedDrafts).forEach(tid => {
              if (tid === next.templateId) return;
              updatedDrafts[tid] = { ...updatedDrafts[tid], ...patch };
            });
          }

          const nextContainer = { ...curr, drafts: updatedDrafts, activeDraftId: next.templateId };
          persistToDB(nextContainer);
          return nextContainer;
        });
      }, 1000);
      return next;
    });
  }, [persistToDB]);

  const handleTemplateChange = async (tid) => {
    if (tid === invData.templateId) return;
    
    setDbConfig(curr => {
      // 1. Sync current state into the container
      const syncDrafts = { ...curr.drafts, [invData.templateId]: invData };
      
      // 2. Load or create next draft
      let nextData = syncDrafts[tid];
      if (!nextData) {
        nextData = {
          ...defaultData(),
          templateId: tid,
          // Pre-sync shared fields from THE CURRENT view
          groomName: invData.groomName,
          brideName: invData.brideName,
          weddingDate: invData.weddingDate,
          venueName: invData.venueName,
          venueAddress: invData.venueAddress,
          rsvpPhone1: invData.rsvpPhone1,
          rsvpPhone2: invData.rsvpPhone2,
        };
        syncDrafts[tid] = nextData;
      }
      
      setInvData(nextData);
      buildSignedUrls(nextData).then(setSignedUrls);
      
      const nextContainer = { ...curr, drafts: syncDrafts, activeDraftId: tid };
      persistToDB(nextContainer);
      return nextContainer;
    });
    setPreviewKey(k => k + 1);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const snapshot = { ...invData };
      const nextContainer = { ...dbConfig, published: snapshot, activeDraftId: invData.templateId };
      const { error } = await supabase.from('events').update({ invitation_config: nextContainer }).eq('id', id);
      if (error) throw error;
      setDbConfig(nextContainer);
      showToast('success', 'Published!', 'Your invitation is now live for guests.');
    } catch (err) {
      showToast('error', 'Publish Failed', err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const uploadPhoto = useCallback(async (file, fieldKey) => {
    if (!user || !event) return;
    setUploadingField(fieldKey);
    try {
      const compressed = await imageCompression(file, { maxSizeMB:1, maxWidthOrHeight:1200, useWebWorker:true });
      const ext = file.name.split('.').pop();
      const storagePath = `${user.id}/${event.id}/invitation/${fieldKey}_${Date.now()}.${ext}`;
      await uploadToR2(compressed, storagePath);
      updateData({ [fieldKey]: { path: storagePath } });
      const signedUrl = await signPath(storagePath);
      setSignedUrls(prev => ({ ...prev, [fieldKey]: signedUrl }));
      showToast('success', 'Photo Uploaded', 'Saved to Cloudflare R2.');
    } catch (err) {
      showToast('error', 'Upload Failed', err.message);
    } finally {
      setUploadingField(null);
    }
  }, [user, event, updateData, showToast]);

  const uploadGalleryPhoto = useCallback(async (file) => {
    if (!user || !event) return;
    setUploadingField('gallery');
    try {
      const compressed = await imageCompression(file, { maxSizeMB:1, maxWidthOrHeight:1200, useWebWorker:true });
      const ext = file.name.split('.').pop();
      const storagePath = `${user.id}/${event.id}/invitation/gallery_${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;
      await uploadToR2(compressed, storagePath);
      const signedUrl = await signPath(storagePath);
      const caption = file.name.replace(/\.[^.]+$/, '');
      const newGalleryItem = { path: storagePath, url: signedUrl, caption };
      
      setInvData(prev => {
        const nextGallery = [...(prev.galleries || []), newGalleryItem];
        const next = { ...prev, galleries: nextGallery };
        const galleryToSave = nextGallery.map(g => g.path ? { path: g.path, caption: g.caption } : { url: g.url, caption: g.caption });
        
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          setDbConfig(curr => {
            const nextDrafts = { ...curr.drafts, [next.templateId]: { ...next, galleries: galleryToSave } };
            const nextCont = { ...curr, drafts: nextDrafts, activeDraftId: next.templateId };
            persistToDB(nextCont);
            return nextCont;
          });
        }, 1000);
        return next;
      });
    } catch (err) {
      showToast('error', 'Upload Failed', err.message);
    } finally {
      setUploadingField(null);
    }
  }, [user, event, persistToDB, showToast]);

  const toggleSection = (key) => {
    const current = invData.hiddenSections || [];
    const next = current.includes(key) ? current.filter(s => s !== key) : [...current, key];
    updateData({ hiddenSections: next });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    showToast('success', 'Link Copied!', 'Share this link with your guests.');
    setTimeout(() => setCopied(false), 2500);
  };

  const tpl = TEMPLATES.find(t => t.id === invData.templateId) || TEMPLATES[0];
  const TemplateComponent = tpl.component;

  const templateData = useMemo(() => ({
    ...invData,
    groomPhoto: signedUrls.groomPhoto || invData.groomPhoto?.url || null,
    bridePhoto: signedUrls.bridePhoto || invData.bridePhoto?.url || null,
    heroPhoto:  signedUrls.heroPhoto  || invData.heroPhoto?.url  || null,
    galleries: (signedUrls.galleries || invData.galleries || []).map(g => ({
      url:     g.url,
      caption: g.caption,
    })),
    hiddenSections: new Set(invData.hiddenSections || []),
  }), [invData, signedUrls]);

  const isChanged = JSON.stringify(dbConfig.published) !== JSON.stringify(invData);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh' }}>
          <Loader2 style={{ animation:'inv-w-spin 1s linear infinite' }} size={32} color="#0f766e" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div style={{ position:'sticky',top:0,zIndex:100,background:'#fff',borderBottom:'1px solid #e4e4e7',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'12px' }}>
          <button onClick={() => navigate(`/events/${id}`)} style={{ display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:600,color:'#71717a',background:'none',border:'none',cursor:'pointer' }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ width:'1px',height:'20px',background:'#e4e4e7' }} />
          <div>
            <p style={{ fontSize:'11px',fontWeight:700,color:'#0f766e',textTransform:'uppercase',letterSpacing:'.05em' }}>Studio Editor</p>
            <p style={{ fontSize:'13px',fontWeight:800,color:'#18181b' }}>{event?.name}</p>
          </div>
          {saving && (
            <div style={{ display:'flex',alignItems:'center',gap:'5px',fontSize:'11px',color:'#71717a' }}>
              <Loader2 size={11} style={{ animation:'inv-w-spin 1s linear infinite' }} />Saving Draft…
            </div>
          )}
        </div>
        <div style={{ display:'flex',gap:'10px',alignItems:'center' }}>
          {isChanged && !saving && (
            <span style={{ fontSize:'10px',fontWeight:800,color:'#b45309',background:'#fef3c7',padding:'4px 10px',borderRadius:'99px',border:'1px solid #fcd34d' }}>UNPUBLISHED</span>
          )}
          <button onClick={handlePublish} disabled={isPublishing || saving} style={{
            display:'flex',alignItems:'center',gap:'6px',padding:'8px 18px',borderRadius:'8px',
            background:'#0f766e',color:'#fff',fontSize:'12px',fontWeight:800,border:'none',cursor:'pointer',
            boxShadow:'0 2px 4px rgba(16,185,129,0.2)', opacity: isPublishing ? 0.7 : 1
          }}>
            {isPublishing ? <Loader2 size={13} style={{ animation:'inv-w-spin 1s linear infinite' }} /> : <Globe size={13} />} Publish Live
          </button>
          <button onClick={copyLink} style={{ display:'flex',alignItems:'center',gap:'6px',padding:'8px 18px',borderRadius:'8px',border:'1px solid #e4e4e7',background:'#fff',color:'#18181b',fontSize:'12px',fontWeight:700,cursor:'pointer' }}>
            {copied ? <Check size={13} /> : <Copy size={13} />} Share
          </button>
        </div>
      </div>

      {/* ── MAIN STUDIO ─────────────────────────────────────── */}
      <div style={{ display:'flex',height:'calc(100vh - 130px)',overflow:'hidden',background:'#f8fafc' }}>
        
        {/* SIDEBAR */}
        <div style={{ width:'340px',borderRight:'1px solid #e4e4e7',overflowY:'auto',background:'#fff',flexShrink:0 }}>
          <div style={{ display:'flex',borderBottom:'1px solid #f1f5f9',position:'sticky',top:0,zIndex:10,background:'#fff' }}>
            {[
              { key:'design',   label:'Template', icon:<Layout size={13} /> },
              { key:'content',  label:'Content',  icon:<Palette size={13} /> },
              { key:'sections', label:'Sections', icon:<EyeOff size={13} /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActivePanel(tab.key)} style={{
                flex:1,padding:'12px 6px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:700,
                display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',
                borderBottom: activePanel === tab.key ? '3px solid #0f766e' : '3px solid transparent',
                color: activePanel === tab.key ? '#0f766e' : '#94a3b8',background:'transparent', transition:'all .2s'
              }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding:'20px' }}>
            {activePanel === 'design' && (
              <div>
                <p style={{ fontSize:'10px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'14px' }}>Select Design</p>
                <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => handleTemplateChange(t.id)} style={{
                      width:'100%',textAlign:'left',padding:'14px',borderRadius:'12px',
                      border: invData.templateId === t.id ? '2px solid #0f766e' : '1px solid #e2e8f0',
                      cursor:'pointer',background: invData.templateId === t.id ? '#f0fdf4' : '#fff',
                      display:'flex',gap:'12px',alignItems:'center'
                    }}>
                      <div style={{ width:'40px',height:'40px',borderRadius:'8px',background:t.bgColor,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <span style={{ fontSize:'18px',color:t.accentColor }}>ॐ</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700,fontSize:'13px',color:'#1e293b' }}>{t.name}</p>
                        <p style={{ fontSize:'11px',color:'#64748b' }}>{t.id === 'rose-purple' ? 'Modern Rose' : 'Golden Royal'}</p>
                      </div>
                      {invData.templateId === t.id && <Check size={14} color="#0f766e" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'content' && (
              <div>
                <Accordion title="👫 Names & Descriptions" defaultOpen>
                  <Field label="Groom's Name"   value={invData.groomName}       onChange={v => updateData({ groomName: v })} isShared />
                  <Field label="Bride's Name"    value={invData.brideName}       onChange={v => updateData({ brideName: v })} isShared />
                  <Field label="About Groom"     value={invData.groomDesc}       onChange={v => updateData({ groomDesc: v })}       rows={3} isShared />
                  <Field label="About Bride"     value={invData.brideDesc}       onChange={v => updateData({ brideDesc: v })}       rows={3} isShared />
                </Accordion>
                <Accordion title="📸 Design Photos">
                   <p style={{ fontSize:'11px',color:'#94a3b8',marginBottom:'12px' }}>Photos are unique to this template.</p>
                  {[{ label:'Hero Background',field:'heroPhoto' },{ label:'Groom Photo',field:'groomPhoto' },{ label:'Bride Photo',field:'bridePhoto' }].map(({ label, field }) => (
                    <PhotoField
                      key={field} label={label}
                      previewUrl={signedUrls[field] || invData[field]?.url || null}
                      storedUrl={invData[field]?.url || ''}
                      onUrlChange={url => { updateData({ [field]: url ? { url } : null }); setSignedUrls(prev => { const n = { ...prev }; delete n[field]; return n; }); }}
                      onUpload={f => uploadPhoto(f, field)}
                      onClear={() => { updateData({ [field]: null }); setSignedUrls(prev => { const n = { ...prev }; delete n[field]; return n; }); }}
                      isUploading={uploadingField === field}
                    />
                  ))}
                </Accordion>
                <Accordion title="📅 Date & Venue">
                  <Field label="Wedding Date" value={invData.weddingDate}   onChange={v => updateData({ weddingDate: v })}   type="datetime-local" isShared />
                  <Field label="Venue Name"   value={invData.venueName}     onChange={v => updateData({ venueName: v })} isShared />
                  <Field label="Address"      value={invData.venueAddress}  onChange={v => updateData({ venueAddress: v })}  rows={2} isShared />
                </Accordion>
                <Accordion title="🖼️ Gallery Images">
                  {(invData.galleries || []).map((g, i) => (
                    <div key={i} style={{ display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px' }}>
                      <img src={g.url} alt="" style={{ width:'36px',height:'36px',borderRadius:'6px',objectFit:'cover' }} />
                      <input value={g.caption || ''} onChange={e => { const gals = [...invData.galleries]; gals[i]={...gals[i],caption:e.target.value}; updateData({galleries:gals}); }} style={{ flex:1,fontSize:'11px',padding:'6px',border:'1px solid #e2e8f0',borderRadius:'4px' }} />
                      <button onClick={()=>updateData({galleries:invData.galleries.filter((_,j)=>j!==i)})} style={{color:'#ef4444',background:'none',border:'none',cursor:'pointer'}}><Trash2 size={12}/></button>
                    </div>
                  ))}
                  <div style={{ marginTop:'10px' }}>
                    <label style={{ cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#0f766e',display:'block',textAlign:'center',padding:'8px',border:'1.5px dashed #0f766e',borderRadius:'8px' }}>
                      + Add Gallery Photos
                      <input type="file" multiple accept="image/*" style={{display:'none'}} onChange={e=>{ Array.from(e.target.files).forEach(uploadGalleryPhoto); e.target.value=''; }} />
                    </label>
                  </div>
                </Accordion>
              </div>
            )}

            {activePanel === 'sections' && (
               <div>
                 <p style={{ fontSize:'10px',fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'14px' }}>Toggle Components</p>
                 {ALL_SECTIONS.map(sec => (
                   <div key={sec.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',borderRadius:'10px',border:'1px solid #edf2f7',background:'#fff',marginBottom:'8px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',fontWeight:600 }}>{sec.icon} {sec.label}</div>
                      <button onClick={()=>toggleSection(sec.key)} style={{ width:'36px',height:'18px',borderRadius:'10px',border:'none',position:'relative',cursor:'pointer',background: invData.hiddenSections.includes(sec.key) ? '#e2e8f0' : '#0f766e' }}>
                        <div style={{ width:'12px',height:'12px',borderRadius:'50%',background:'#fff',position:'absolute',top:'3px',left: invData.hiddenSections.includes(sec.key) ? '3px' : '21px',transition:'left .2s'}} />
                      </button>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>

        {/* PREVIEW STUDIO */}
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          
          <div style={{ padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff',borderBottom:'1px solid #e4e4e7' }}>
            <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
              <Smartphone size={15} color="#0f766e" />
              <span style={{ fontSize:'10px',fontWeight:800,color:'#0f766e',textTransform:'uppercase',letterSpacing:'.1em' }}>Mobile Preview</span>
            </div>
            
            <button onClick={()=>setPreviewKey(k=>k+1)} style={{ background:'none',border:'none',cursor:'pointer',color:'#94a3b8' }} title="Reload Preview">
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ flex:1,padding:'24px',display:'flex',justifyContent:'center',alignItems:'flex-start',overflowY:'auto',background:'#f1f5f9' }}>
            <div style={{ 
              width: '375px',
              minHeight: '667px',
              height: 'fit-content',
              background: '#fff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderRadius: '32px',
              border: '12px solid #1e293b',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <iframe
                key={previewKey}
                title="invitation-preview"
                srcDoc={`
                  <html>
                    <head>
                      <style>
                        body { margin: 0; padding: 0; overflow-x: hidden; width: 100%; }
                        .inv2-root, .inv-root { overflow-x: hidden; width: 100%; }
                      </style>
                    </head>
                    <body>
                      <div id="render-root"></div>
                    </body>
                  </html>
                `}
                style={{ width:'100%', height:'800px', border:'none' }}
                onLoad={(e) => {
                  const doc = e.target.contentDocument;
                  const root = doc.getElementById('render-root');
                  if (root && TemplateComponent) {
                    import('react-dom/client').then(ReactDOM => {
                      const rootInstance = ReactDOM.createRoot(root);
                      rootInstance.render(
                        <TemplateComponent data={templateData} />
                      );
                    });
                  }
                }}
              />
              
              {/* Removed fallback rendering to prevent animation/style leaks */}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes inv-w-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
