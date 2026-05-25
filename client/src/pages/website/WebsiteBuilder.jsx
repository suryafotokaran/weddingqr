import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TEMPLATES, SECTIONS, DEFAULT_DATA } from './templates/templateRegistry';
import TemplateRenderer from './TemplateRenderer';
import { ChevronLeft, ChevronDown, ChevronUp, Globe, Copy, Check, Plus, Trash2, Save, Eye, EyeOff, Smartphone, Upload, ImageIcon } from 'lucide-react';
import Toast from '../../components/Toast';
import { uploadToR2 } from '../../lib/s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../../lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

function SectionIcon({ name, size = 15, className = '' }) {
  const Icon = LucideIcons[name];
  return Icon ? <Icon size={size} className={className} /> : null;
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else { result[key] = override[key]; }
  }
  return result;
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-zinc-300'}`}>
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function Field({ label, value, onChange, type = 'text', multiline = false, small = false }) {
  const cls = "w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all";
  return (
    <div className={small ? 'w-16 flex-shrink-0' : 'flex-1'}>
      <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={cls + ' resize-none'} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} />}
    </div>
  );
}

function HeroForm({ data, onChange }) {
  const h = data.hero || {};
  const set = (k, v) => onChange({ ...data, hero: { ...h, [k]: v } });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Field label="Groom Name" value={h.groomName || ''} onChange={v => set('groomName', v)} />
        <Field label="Bride Name" value={h.brideName || ''} onChange={v => set('brideName', v)} />
      </div>
      <Field label="Tagline" value={h.tagline || ''} onChange={v => set('tagline', v)} />
      <div className="flex gap-2">
        <Field label="Date" type="date" value={h.date || ''} onChange={v => set('date', v)} />
        <Field label="City" value={h.city || ''} onChange={v => set('city', v)} />
      </div>
    </div>
  );
}

function ScheduleForm({ data, onChange }) {
  const items = data.schedule?.items || [];
  const update = items2 => onChange({ ...data, schedule: { ...data.schedule, items: items2 } });
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="bg-zinc-50 rounded-xl p-3 space-y-2 border border-zinc-100">
          <div className="flex gap-2">
            <Field label="Icon" value={it.icon || ''} onChange={v => update(items.map((x, j) => j === i ? { ...x, icon: v } : x))} small />
            <Field label="Time" value={it.time || ''} onChange={v => update(items.map((x, j) => j === i ? { ...x, time: v } : x))} />
          </div>
          <Field label="Name" value={it.name || ''} onChange={v => update(items.map((x, j) => j === i ? { ...x, name: v } : x))} />
          <Field label="Description" value={it.desc || ''} onChange={v => update(items.map((x, j) => j === i ? { ...x, desc: v } : x))} />
          <button onClick={() => update(items.filter((_, j) => j !== i))} className="text-red-400 text-xs flex items-center gap-1 hover:text-red-600"><Trash2 size={11} /> Remove</button>
        </div>
      ))}
      <button onClick={() => update([...items, { icon: '🎊', time: '', name: '', desc: '' }])} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold"><Plus size={12} /> Add Event</button>
    </div>
  );
}

function VenueForm({ data, onChange }) {
  const items = data.venue?.items || [];
  const update = items2 => onChange({ ...data, venue: { ...data.venue, items: items2 } });
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="bg-zinc-50 rounded-xl p-3 space-y-2 border border-zinc-100">
          <div className="flex gap-2">
            <Field label="Icon" value={v.icon || ''} onChange={val => update(items.map((x, j) => j === i ? { ...x, icon: val } : x))} small />
            <Field label="Name" value={v.name || ''} onChange={val => update(items.map((x, j) => j === i ? { ...x, name: val } : x))} />
          </div>
          <Field label="Address" value={v.address || ''} onChange={val => update(items.map((x, j) => j === i ? { ...x, address: val } : x))} />
          <Field label="Tags (comma separated)" value={(v.tags || []).join(', ')} onChange={val => update(items.map((x, j) => j === i ? { ...x, tags: val.split(',').map(t => t.trim()).filter(Boolean) } : x))} />
          <button onClick={() => update(items.filter((_, j) => j !== i))} className="text-red-400 text-xs flex items-center gap-1 hover:text-red-600"><Trash2 size={11} /> Remove</button>
        </div>
      ))}
      <button onClick={() => update([...items, { icon: '🏛️', name: '', address: '', tags: [] }])} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold"><Plus size={12} /> Add Venue</button>
    </div>
  );
}

function LocationForm({ data, onChange }) {
  const loc = data.location || {};
  const set = (k, v) => onChange({ ...data, location: { ...loc, [k]: v } });
  return (
    <div className="space-y-3">
      <Field label="Google Maps URL" value={loc.mapUrl || ''} onChange={v => set('mapUrl', v)} />
      <Field label="Map Embed URL" value={loc.embedUrl || ''} onChange={v => set('embedUrl', v)} />
    </div>
  );
}

function FamilyMemberList({ label, members, onChange }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={i} className="bg-zinc-50 rounded-xl p-3 space-y-1.5 border border-zinc-100">
            <div className="flex gap-2">
              <Field label="Emoji" value={m.emoji || ''} onChange={v => onChange(members.map((x, j) => j === i ? { ...x, emoji: v } : x))} small />
              <Field label="Name" value={m.name || ''} onChange={v => onChange(members.map((x, j) => j === i ? { ...x, name: v } : x))} />
            </div>
            <Field label="Role" value={m.role || ''} onChange={v => onChange(members.map((x, j) => j === i ? { ...x, role: v } : x))} />
            <button onClick={() => onChange(members.filter((_, j) => j !== i))} className="text-red-400 text-xs flex items-center gap-1 hover:text-red-600"><Trash2 size={11} /> Remove</button>
          </div>
        ))}
        <button onClick={() => onChange([...members, { emoji: '👤', name: '', role: '' }])} className="flex items-center gap-1 text-xs text-indigo-600 font-semibold"><Plus size={12} /> Add Member</button>
      </div>
    </div>
  );
}

function FamilyForm({ data, onChange }) {
  const fam = data.family || {};
  return (
    <div className="space-y-4">
      <FamilyMemberList label="Groom's Side" members={fam.groomSide || []} onChange={v => onChange({ ...data, family: { ...fam, groomSide: v } })} />
      <FamilyMemberList label="Bride's Side" members={fam.brideSide || []} onChange={v => onChange({ ...data, family: { ...fam, brideSide: v } })} />
    </div>
  );
}

function GalleryForm({ data, onChange, userId, eventName }) {
  const items = data.gallery?.items || [];
  const update = items2 => onChange({ ...data, gallery: { ...data.gallery, items: items2 } });

  const handleUpload = async (i, file) => {
    if (!file) return;
    const ext = file.name.split('.').pop();
    const key = `${userId}/${eventName}/website-gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      await uploadToR2(file, key);
      const cmd = new GetObjectCommand({ Bucket: import.meta.env.VITE_R2_BUCKET, Key: key });
      const signedUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 604800 }); // 7 days
      update(items.map((x, j) => j === i ? { ...x, url: signedUrl, storage_path: key, size_bytes: file.size } : x));
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="bg-zinc-50 rounded-xl p-3 space-y-2 border border-zinc-100">
          <div className="flex items-center gap-2">
            {/* Thumbnail or upload area */}
            <label className="w-14 h-14 rounded-lg overflow-hidden border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors shrink-0 bg-white">
              {it.url
                ? <img src={it.url} alt="" className="w-full h-full object-cover" />
                : <ImageIcon size={18} className="text-zinc-300" />}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(i, e.target.files[0])} />
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Caption</p>
              <input
                type="text" value={it.caption || ''}
                onChange={e => update(items.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))}
                placeholder="Add a caption…"
                className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-sm text-zinc-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
              />
            </div>
            <button onClick={() => update(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
          </div>
          {!it.url && (
            <label className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold cursor-pointer hover:text-indigo-800">
              <Upload size={12} /> Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(i, e.target.files[0])} />
            </label>
          )}
        </div>
      ))}
      <button
        onClick={() => update([...items, { url: '', storage_path: '', caption: '' }])}
        className="flex items-center gap-1 text-xs text-indigo-600 font-semibold"
      >
        <Plus size={12} /> Add Photo
      </button>
    </div>
  );
}

function ThankyouForm({ data, onChange }) {
  const ty = data.thankyou || {};
  return <Field label="Thank You Message" value={ty.message || ''} onChange={v => onChange({ ...data, thankyou: { ...ty, message: v } })} multiline />;
}

const SECTION_FORMS = { hero: HeroForm, schedule: ScheduleForm, venue: VenueForm, location: LocationForm, family: FamilyForm, gallery: GalleryForm, thankyou: ThankyouForm };

// Pass userId + eventName to GalleryForm via a wrapper so it can upload to the right path
function makeGalleryForm(userId, eventName) {
  return function GalleryFormWrapper(props) {
    return <GalleryForm {...props} userId={userId} eventName={eventName} />;
  };
}

// ─────────────────────────────────────────────────────────────
export default function WebsiteBuilder() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();

  const [configId, setConfigId] = useState(null);
  const [templateId, setTemplateId] = useState('template1');
  const [data, setData] = useState(DEFAULT_DATA);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState('edit');
  const [previewMode, setPreviewMode] = useState('phone');
  const [slug, setSlug] = useState('');
  const [eventUserId, setEventUserId] = useState('');
  const [eventName, setEventName] = useState('');

  const generateSlug = (heroData) => {
    const g = (heroData?.groomName || '').trim();
    const b = (heroData?.brideName || '').trim();
    if (!g && !b) return '';
    return `${g}-and-${b}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  };

  const shareUrl = slug
    ? `${window.location.origin}/w/${slug}`
    : `${window.location.origin}/w/${eventId}`;

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from('events').select('user_id, name').eq('id', eventId).single();
      if (ev) {
        setEventUserId(ev.user_id);
        setEventName(ev.name);
      }

      const { data: existing } = await supabase.from('website_configs').select('*').eq('event_id', eventId).single();
      if (existing) {
        setConfigId(existing.id);
        setTemplateId(existing.template_id || 'template1');
        setData(deepMerge(DEFAULT_DATA, existing.data || {}));
        setIsPublished(existing.is_published || false);
        setSlug(existing.slug || '');
      } else {
        const { data: created } = await supabase.from('website_configs').insert({ event_id: eventId, template_id: 'template1', data: DEFAULT_DATA, is_published: false }).select().single();
        if (created) setConfigId(created.id);
      }
      setLoading(false);
    })();
  }, [eventId]);

  const handleDataChange = (newData) => { setData(newData); setHasUnsaved(true); };
  const handleTemplateChange = (tid) => { setTemplateId(tid); setHasUnsaved(true); };

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000);
  };

  const doSave = async (publish = null) => {
    if (!configId) return;
    setIsSaving(true);
    const newSlug = generateSlug(data.hero);
    const galleryBytes = (data?.gallery?.items ?? []).reduce((sum, item) => sum + (item.size_bytes || 0), 0);
    const updates = { data, template_id: templateId, updated_at: new Date().toISOString(), gallery_size_bytes: galleryBytes };
    if (newSlug) updates.slug = newSlug;
    if (publish !== null) updates.is_published = publish;
    const { error } = await supabase.from('website_configs').update(updates).eq('id', configId);
    setIsSaving(false);
    if (!error) {
      if (newSlug) setSlug(newSlug);
      setHasUnsaved(false);
      if (publish === true)  { setIsPublished(true);  showToast('success', 'Published! 🎉', 'Your wedding website is now live.'); }
      else if (publish === false) { setIsPublished(false); showToast('success', 'Unpublished', 'Your site is now hidden from visitors.'); }
      else { showToast('success', 'Saved', 'All changes saved successfully.'); }
    } else {
      showToast('error', 'Save failed', error.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-500 text-sm">Loading builder…</div>;

  const statusDot = isPublished ? 'bg-green-400' : 'bg-zinc-600';
  const statusLabel = isSaving ? 'Saving…' : hasUnsaved ? 'Unsaved' : isPublished ? 'Published' : 'Draft';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950">

      {/* ── TOP NAV BAR ── */}
      <header className="flex items-center gap-3 px-5 py-0 bg-zinc-900 border-b border-zinc-800 shrink-0 h-14">
        <button onClick={() => navigate(`/admin/events/${eventId}`)} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={18} />
          <span className="text-sm font-medium hidden sm:block">Back</span>
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-white font-semibold text-sm truncate">Website Builder</span>
          <div className="flex items-center gap-1.5 bg-zinc-800 rounded-full px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${statusDot} ${isSaving ? 'animate-pulse' : ''}`} />
            <span className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wider">{statusLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <button
            onClick={() => setPreviewMode(m => m === 'phone' ? 'full' : 'phone')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
          >
            <Smartphone size={13} /> {previewMode === 'phone' ? 'Full' : 'Phone'}
          </button>

          {/* Save */}
          <button
            onClick={() => doSave()}
            disabled={!hasUnsaved || isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${hasUnsaved ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
          >
            <Save size={14} /> {isSaving ? 'Saving…' : 'Save'}
          </button>

          {/* Publish / Unpublish */}
          {!isPublished ? (
            <button onClick={() => doSave(true)} disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
              <Globe size={14} /> Publish
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-600/30 transition-all">
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Share</>}
              </button>
              <div className="flex items-center gap-1.5 bg-green-900/40 border border-green-500/30 rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300 text-xs font-bold">Live</span>
                <button onClick={() => doSave(false)} className="text-zinc-500 hover:text-red-400 text-[10px] font-semibold ml-1 transition-colors">✕</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <aside className="w-72 shrink-0 flex flex-col bg-white border-r border-zinc-200 overflow-hidden">

          {/* Mobile tabs */}
          <div className="md:hidden flex border-b border-zinc-100">
            <button onClick={() => setMobileTab('edit')} className={`flex-1 py-2.5 text-xs font-bold ${mobileTab === 'edit' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-zinc-400'}`}>Edit</button>
            <button onClick={() => setMobileTab('preview')} className={`flex-1 py-2.5 text-xs font-bold ${mobileTab === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-zinc-400'}`}>Preview</button>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* Template picker */}
            <div className="p-4 border-b border-zinc-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Template</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => handleTemplateChange(tpl.id)}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all ${templateId === tpl.id ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-zinc-100 bg-zinc-50 hover:border-zinc-200'}`}>
                    <div className="text-xl mb-1.5">{tpl.thumbnail}</div>
                    <div className="text-[11px] font-bold text-zinc-800 leading-tight">{tpl.name}</div>
                    <div className="flex gap-1 mt-1.5">
                      {tpl.colors.map((c, i) => <div key={i} style={{ background: c }} className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" />)}
                    </div>
                    {templateId === tpl.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sections */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Sections</p>
              <div className="space-y-1.5">
                {SECTIONS.map(sec => {
                  const secData = data[sec.key] || {};
                  const enabled = secData.enabled !== false;
                  const isOpen = activeSection === sec.key;
                  const Form = sec.key === 'gallery' ? makeGalleryForm(eventUserId, eventName) : SECTION_FORMS[sec.key];
                  return (
                    <div key={sec.key} className={`rounded-xl border transition-all ${isOpen ? 'border-indigo-200 bg-indigo-50/30' : 'border-zinc-100 bg-white'}`}>
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <Toggle checked={enabled} onChange={v => handleDataChange({ ...data, [sec.key]: { ...secData, enabled: v } })} />
                        <SectionIcon name={sec.icon} size={15} className={enabled ? 'text-indigo-500' : 'text-zinc-300'} />
                        <button className={`flex-1 text-left text-sm font-semibold transition-colors ${enabled ? 'text-zinc-800' : 'text-zinc-400'}`}
                          onClick={() => Form && activeSection !== sec.key ? setActiveSection(sec.key) : setActiveSection(null)}>
                          {sec.label}
                        </button>
                        {Form && (
                          <button onClick={() => setActiveSection(isOpen ? null : sec.key)} className={`transition-colors ${isOpen ? 'text-indigo-500' : 'text-zinc-300 hover:text-zinc-500'}`}>
                            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        )}
                      </div>
                      {isOpen && Form && enabled && (
                        <div className="px-3 pb-3 pt-1">
                          <Form data={data} onChange={handleDataChange} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Share section */}
            <div className="p-4 border-t border-zinc-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Share</p>
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 mb-3">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Public Link</p>
                <p className="text-xs text-zinc-600 break-all font-mono leading-relaxed">{shareUrl}</p>
              </div>
              <button onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-sm hover:bg-zinc-50 transition-all">
                {copied ? <><Check size={14} className="text-green-500" /> Copied!</> : <><Copy size={14} /> Copy Link</>}
              </button>
              {isPublished && (
                <a href={shareUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 transition-all">
                  <Eye size={14} /> Open Site
                </a>
              )}
            </div>
          </div>
        </aside>

        {/* ── PREVIEW PANE ── */}
        <main className={`flex-1 flex flex-col overflow-hidden bg-zinc-950 ${mobileTab === 'edit' ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            {previewMode === 'phone' ? (
              /* Phone mockup */
              <div className="relative flex flex-col items-center">
                <div className="relative w-[390px] bg-zinc-800 rounded-[52px] p-[10px] shadow-2xl shadow-black/60 ring-1 ring-white/10">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-zinc-800 rounded-b-3xl z-10 flex items-center justify-center">
                    <div className="w-16 h-4 bg-zinc-900 rounded-full" />
                  </div>
                  {/* Screen */}
                  <div className="w-full overflow-hidden rounded-[44px] bg-zinc-900 flex flex-col" style={{ height: '640px' }}>
                    {/* Status bar */}
                    <div className="h-8 shrink-0 bg-zinc-900 flex items-center justify-between px-6 pt-1">
                      <span className="text-white text-[10px] font-semibold">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-2 rounded-sm border border-white/60 relative"><div className="absolute inset-0.5 right-0.5 bg-white/60 rounded-sm" style={{right:'25%'}} /></div>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 overflow-hidden bg-white">
                      <TemplateRenderer templateId={templateId} data={data} />
                    </div>
                  </div>
                </div>
                <p className="text-zinc-600 text-xs mt-4 font-medium">iPhone 14 Pro · 390 × 844</p>
              </div>
            ) : (
              /* Full browser frame */
              <div className="w-full h-full max-w-5xl flex flex-col rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2.5 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  </div>
                  <div className="flex-1 mx-4 bg-zinc-700 rounded-md px-3 py-1 text-xs text-zinc-400 font-mono truncate">{shareUrl}</div>
                </div>
                <div className="flex-1 bg-white overflow-auto">
                  <TemplateRenderer templateId={templateId} data={data} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
