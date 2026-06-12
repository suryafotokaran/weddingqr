import { useState, useEffect, useRef, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TEMPLATES, SECTIONS, DEFAULT_DATA } from './templates/templateRegistry';
import TemplateRenderer from './TemplateRenderer';
import { ChevronLeft, ChevronDown, ChevronUp, Globe, Copy, Check, Plus, Trash2, Eye, EyeOff, Smartphone, Upload, ImageIcon, Pencil, Sparkles, EyeOff as Unpublish } from 'lucide-react';

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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-all duration-200"
      style={checked
        ? { background: 'linear-gradient(135deg, #e8708a 0%, #c9956c 100%)', boxShadow: '0 2px 8px rgba(232,112,138,0.35)' }
        : { background: '#d1d5db' }
      }
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
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
    const GB10 = 10 * 1024 * 1024 * 1024;
    const { data: used } = await supabase.rpc('get_user_photo_storage', { p_user_id: userId });
    if ((used ?? 0) + file.size > GB10) {
      alert('Storage limit reached (10 GB). Please delete some files to free up space.');
      return;
    }
    const ext = file.name.split('.').pop();
    const key = `${eventName}/website-gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

const ALL_LANGS = [
  { code: 'en', label: 'English',    native: 'English',   flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil',      native: 'தமிழ்',     flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi',      native: 'हिंदी',      flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',    native: 'ಕನ್ನಡ',     flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',     native: 'తెలుగు',    flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam',  native: 'മലയാളം',    flag: '🇮🇳' },
];

function LanguagesForm({ data, onChange }) {
  const langs = data.languages || {};
  const selected = langs.selected || ['en', 'ta'];

  const toggle = (code) => {
    if (code === 'en') return; // English is always on
    const next = selected.includes(code)
      ? selected.filter(l => l !== code)
      : [...selected, code];
    onChange({ ...data, languages: { ...langs, selected: next } });
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
        Guests can switch the website language. You only type in English — we auto-translate everything.
      </p>
      {ALL_LANGS.map(({ code, label, native, flag }) => {
        const isOn = selected.includes(code);
        const locked = code === 'en';
        return (
          <button
            key={code}
            type="button"
            onClick={() => toggle(code)}
            disabled={locked}
            className="w-full flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all"
            style={isOn
              ? { borderColor: '#e8708a', background: 'linear-gradient(135deg,#fff5f7,#fffaf5)' }
              : { borderColor: '#f0f0f0', background: '#fafafa' }
            }
          >
            <span className="text-lg leading-none">{flag}</span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-zinc-800">{label}</span>
              <span className="block text-[11px] text-zinc-400">{native}</span>
            </span>
            {locked
              ? <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Default</span>
              : <div className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-all duration-200"
                  style={isOn
                    ? { background: 'linear-gradient(135deg,#e8708a,#c9956c)', boxShadow: '0 2px 8px rgba(232,112,138,.35)' }
                    : { background: '#d1d5db' }
                  }>
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isOn ? 'translate-x-4' : 'translate-x-1'}`} />
                </div>
            }
          </button>
        );
      })}
    </div>
  );
}

const SECTION_FORMS = { hero: HeroForm, schedule: ScheduleForm, venue: VenueForm, location: LocationForm, family: FamilyForm, gallery: GalleryForm, thankyou: ThankyouForm, languages: LanguagesForm };

// Pass userId + eventName to GalleryForm via a wrapper so it can upload to the right path
function makeGalleryForm(userId, eventName) {
  return function GalleryFormWrapper(props) {
    return <GalleryForm {...props} userId={userId} eventName={eventName} />;
  };
}

// ─────────────────────────────────────────────────────────────
export default function WebsiteBuilder() {
  const params = useParams();
  const eventId = params.id || params.eventId;
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicMode = location.pathname.startsWith('/w/');

  const [configId, setConfigId] = useState(null);
  const [templateId, setTemplateId] = useState('template4');
  const [data, setData] = useState(DEFAULT_DATA);
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const isFirstLoad = useRef(true);
  const autoSaveTimer = useRef(null);
  const latestRef = useRef({ data, templateId, configId });
  const [activeSection, setActiveSection] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState('edit');
  const [templateCategory, setTemplateCategory] = useState('modern');
  const [previewMode, setPreviewMode] = useState('phone');
  const [slug, setSlug] = useState('');
  const [eventUserId, setEventUserId] = useState('');
  const [eventName, setEventName] = useState('');
  const GalleryFormMemo = useMemo(() => makeGalleryForm(eventUserId, eventName), [eventUserId, eventName]);

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
        const savedTemplate = existing.template_id || 'template4';
        setTemplateId(savedTemplate);
        const CATEGORY_MAP = { modern: ['template4','template6','template7','template8','template9'], hindu: ['template3','template5'], muslim: ['template2'], christian: ['template1'] };
        const matchedCat = Object.keys(CATEGORY_MAP).find(cat => CATEGORY_MAP[cat].includes(savedTemplate));
        if (matchedCat) setTemplateCategory(matchedCat);
        setData(deepMerge(DEFAULT_DATA, existing.data || {}));
        setIsPublished(existing.is_published ?? true);
        setSlug(existing.slug || '');
      } else {
        const { data: created } = await supabase.from('website_configs').insert({ event_id: eventId, template_id: 'template1', data: DEFAULT_DATA, is_published: true }).select().single();
        if (created) setConfigId(created.id);
      }
      setLoading(false);
    })();
  }, [eventId]);

  const handleDataChange = (newData) => { setData(newData); };
  const handleTemplateChange = (tid) => { setTemplateId(tid); };

  // Keep latestRef in sync so the auto-save timer always writes fresh values
  useEffect(() => { latestRef.current = { data, templateId, configId }; }, [data, templateId, configId]);

  // Auto-save on any data / template change (debounced 800 ms)
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const { data: d, templateId: tid, configId: cid } = latestRef.current;
      if (!cid) return;
      setIsSaving(true);
      const newSlug = generateSlug(d.hero);
      const galleryBytes = (d?.gallery?.items ?? []).reduce((sum, item) => sum + (item.size_bytes || 0), 0);
      const updates = { data: d, template_id: tid, updated_at: new Date().toISOString(), gallery_size_bytes: galleryBytes };
      if (newSlug) updates.slug = newSlug;
      const { error } = await supabase.from('website_configs').update(updates).eq('id', cid);
      setIsSaving(false);
      if (!error && newSlug) setSlug(newSlug);
    }, 800);
    return () => clearTimeout(autoSaveTimer.current);
  }, [data, templateId]);

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4000);
  };

  const togglePublish = async (publish) => {
    if (!configId) return;
    setIsSaving(true);
    const { error } = await supabase.from('website_configs').update({ is_published: publish, updated_at: new Date().toISOString() }).eq('id', configId);
    setIsSaving(false);
    if (!error) {
      setIsPublished(publish);
      if (publish) showToast('success', 'Published!', 'Your wedding website is now live.');
      else showToast('success', 'Unpublished', 'Your site is now hidden from visitors.');
    } else {
      showToast('error', 'Failed', error.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[100dvh]"
      style={{ background: 'linear-gradient(145deg, #0a0a0f 0%, #130d10 100%)' }}>
      <div className="relative mb-6">
        <div className="absolute -inset-4 rounded-[28px] opacity-50 blur-2xl animate-pulse pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #e8708a, #c9956c)' }} />
        <div className="relative w-20 h-20 rounded-[24px] flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #e8708a 0%, #c9956c 100%)', boxShadow: '0 20px 60px rgba(232,112,138,0.35)' }}>
          <Sparkles size={32} className="text-white" />
        </div>
      </div>
      <p className="text-white font-extrabold text-xl tracking-tight">Wedding Builder</p>
      <p className="text-zinc-500 text-sm mt-1.5 font-medium">Preparing your canvas…</p>
      <div className="flex gap-2 mt-8">
        {[0, 150, 300].map((delay, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-rose-400 animate-bounce"
            style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
    </div>
  );

  const statusLabel = isSaving ? 'Saving…' : isPublished ? 'Live' : 'Unpublished';
  const statusStyle = isSaving
    ? { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', pill: 'bg-amber-900/25 border-amber-500/25' }
    : isPublished
    ? { dot: 'bg-emerald-400', text: 'text-emerald-400', pill: 'bg-emerald-900/25 border-emerald-500/25' }
    : { dot: 'bg-zinc-600', text: 'text-zinc-500', pill: 'bg-zinc-800/60 border-zinc-700/40' };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #12081e 0%, #0f0a1a 50%, #130d10 100%)' }}>

      {/* ─────────── PREMIUM HEADER ─────────── */}
      <header
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 shrink-0 h-14 sm:h-16"
        style={{
          background: 'rgba(13,11,16,0.96)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left — back + brand */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {!isPublicMode && (
            <button
              onClick={() => navigate(`/admin/events/${eventId}`)}
              className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #e8708a 0%, #c9956c 100%)', boxShadow: '0 4px 12px rgba(232,112,138,0.3)' }}>
              <Sparkles size={13} className="text-white" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-white font-bold text-sm leading-none truncate">
                {isPublicMode ? 'Your Wedding Website' : 'Website Builder'}
              </p>
              {eventName && (
                <p className="text-zinc-500 text-[10px] mt-0.5 truncate font-medium">{eventName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Center — status pill */}
        <div className="flex justify-center shrink-0">
          <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${statusStyle.pill}`}>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dot} ${isSaving ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${statusStyle.text}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end">
          {/* Preview toggle — desktop only */}
          <button
            onClick={() => setPreviewMode(m => m === 'phone' ? 'full' : 'phone')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-white/5"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
          >
            <Smartphone size={13} />
            <span className="hidden lg:inline">{previewMode === 'phone' ? 'Full' : 'Phone'}</span>
          </button>

          {/* Share link — always visible when published */}
          {isPublished && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border"
              style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: '#6ee7b7' }}
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Share</>}
            </button>
          )}

          {/* Unpublish / Publish toggle */}
          {isPublished ? (
            <button
              onClick={() => togglePublish(false)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold disabled:opacity-50 transition-all border"
              style={{ background: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}
            >
              <EyeOff size={13} />
              <span className="hidden sm:inline">Unpublish</span>
            </button>
          ) : (
            <button
              onClick={() => togglePublish(true)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #e8708a 0%, #c9956c 100%)', boxShadow: '0 4px 16px rgba(232,112,138,0.3)' }}
            >
              <Globe size={13} />
              <span className="hidden sm:inline">Publish</span>
            </button>
          )}
        </div>
      </header>

      {/* ─────────── BODY ─────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─────────── EDIT PANEL ─────────── */}
        <aside className={`flex flex-col bg-white overflow-hidden
          md:w-80 md:shrink-0 md:border-r md:border-zinc-100
          ${mobileTab === 'edit' ? 'flex flex-1' : 'hidden md:flex'}
        `}
          style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.15)' }}
        >
          {/* Panel header */}
          <div className="px-5 py-4 border-b border-zinc-100 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-0.5"
                  style={{ background: 'linear-gradient(135deg, #e8708a, #c9956c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Customize
                </p>
                <h2 className="text-base font-extrabold text-zinc-900 tracking-tight">Your Wedding Site</h2>
              </div>
              {/* Mobile — switch to preview */}
              <button
                onClick={() => setMobileTab('preview')}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Template Picker ── */}
            {(() => {
              const CATEGORIES = [
                { id: 'modern',    label: 'Modern',    emoji: '🏮' },
                { id: 'hindu',     label: 'Hindu',     emoji: '🛕' },
                { id: 'muslim',    label: 'Muslim',    emoji: '🌙' },
                { id: 'christian', label: 'Christian', emoji: '✝️' },
              ];
              const CATEGORY_MAP = {
                modern:    ['template4', 'template6', 'template7', 'template8', 'template9'],
                hindu:     ['template3', 'template5'],
                muslim:    ['template2'],
                christian: ['template1'],
              };
              const visibleTemplates = TEMPLATES.filter(t => (CATEGORY_MAP[templateCategory] || []).includes(t.id));
              return (
                <div className="p-4 border-b border-zinc-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-3">Choose Template</p>
                  <div className="flex gap-1.5 mb-3">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setTemplateCategory(cat.id)}
                        className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[9px] font-bold transition-all duration-200 border"
                        style={templateCategory === cat.id
                          ? { background: 'linear-gradient(135deg, #e8708a 0%, #c9956c 100%)', borderColor: 'transparent', color: '#fff', boxShadow: '0 2px 8px rgba(232,112,138,0.3)' }
                          : { background: '#f5f5f5', borderColor: '#ebebeb', color: '#71717a' }
                        }
                      >
                        <span className="text-base leading-none">{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {visibleTemplates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handleTemplateChange(tpl.id)}
                        className="relative rounded-2xl border-2 p-3.5 text-left transition-all duration-200"
                        style={templateId === tpl.id
                          ? { borderColor: '#e8708a', background: 'linear-gradient(135deg, #fff5f7 0%, #fffaf5 100%)', boxShadow: '0 4px 16px rgba(232,112,138,0.15)' }
                          : { borderColor: '#f0f0f0', background: '#fafafa' }
                        }
                      >
                        <div className="text-2xl mb-2 leading-none">{tpl.thumbnail}</div>
                        <div className="text-[11px] font-bold text-zinc-800 leading-tight">{tpl.name}</div>
                        {templateId === tpl.id && (
                          <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                            style={{ background: 'linear-gradient(135deg, #e8708a, #c9956c)' }}>
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Sections ── */}
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-3">Sections</p>
              <div className="space-y-2">
                {SECTIONS.map(sec => {
                  const secData = data[sec.key] || {};
                  const enabled = secData.enabled !== false;
                  const isOpen = activeSection === sec.key;
                  const Form = sec.key === 'gallery'
                    ? GalleryFormMemo
                    : SECTION_FORMS[sec.key];

                  return (
                    <div
                      key={sec.key}
                      className="rounded-2xl border-2 overflow-hidden transition-all duration-200"
                      style={isOpen
                        ? { borderColor: '#f5c0cc', background: 'linear-gradient(135deg, #fff8f9 0%, #fffcf8 100%)' }
                        : { borderColor: '#f0f0f0', background: '#fff' }
                      }
                    >
                      <div className="flex items-center gap-3 px-3.5 py-3">
                        <Toggle
                          checked={enabled}
                          onChange={v => handleDataChange({ ...data, [sec.key]: { ...secData, enabled: v } })}
                        />
                        <SectionIcon
                          name={sec.icon}
                          size={15}
                          className={enabled ? 'text-rose-400' : 'text-zinc-300'}
                        />
                        <button
                          className={`flex-1 text-left text-sm font-semibold transition-colors
                            ${enabled ? 'text-zinc-800' : 'text-zinc-400'}`}
                          onClick={() => Form && setActiveSection(isOpen ? null : sec.key)}
                        >
                          {sec.label}
                        </button>
                        {Form && (
                          <button
                            onClick={() => setActiveSection(isOpen ? null : sec.key)}
                            className="transition-all duration-200"
                            style={{ color: isOpen ? '#e8708a' : '#d1d5db' }}
                          >
                            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        )}
                      </div>
                      {isOpen && Form && enabled && (
                        <div className="px-3.5 pb-4 pt-1 border-t border-rose-100/70">
                          <Form data={data} onChange={handleDataChange} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Share ── */}
            <div className="p-4 border-t border-zinc-100">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-3">Share</p>
              <div className="rounded-2xl p-3.5 border border-zinc-100 mb-3"
                style={{ background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)' }}>
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1.5">Public Link</p>
                <p className="text-xs text-zinc-600 break-all font-mono leading-relaxed select-all">{shareUrl}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm transition-all border-2"
                style={copied
                  ? { borderColor: '#10b981', color: '#10b981', background: '#f0fdf4' }
                  : { borderColor: '#e5e7eb', color: '#374151', background: '#fff' }
                }
              >
                {copied
                  ? <><Check size={14} /> Copied!</>
                  : <><Copy size={14} /> Copy Share Link</>
                }
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #e8708a 0%, #c9956c 100%)', boxShadow: '0 4px 16px rgba(232,112,138,0.25)' }}
              >
                <Eye size={14} /> Open Live Site
              </a>
            </div>

            {/* Bottom padding for mobile nav */}
            <div className="h-20 md:h-4" />
          </div>
        </aside>

        {/* ─────────── PREVIEW PANE ─────────── */}
        <main
          className={`flex-1 overflow-hidden relative
            ${mobileTab === 'preview' ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
          `}
        >
          {/* Premium background */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(145deg, #1a0a2e 0%, #0f0a1a 35%, #1a0f0a 65%, #0a1020 100%)',
            }} />
          {/* Subtle rose-gold radial glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,149,108,0.10) 0%, rgba(232,112,138,0.06) 40%, transparent 70%)',
            }} />
          {/* Fine dot grid */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />

          {/* Preview mode toggle — desktop */}
          <div className="absolute top-4 right-4 z-10 hidden md:flex">
            <button
              onClick={() => setPreviewMode(m => m === 'phone' ? 'full' : 'phone')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Smartphone size={13} />
              {previewMode === 'phone' ? 'Full View' : 'Phone View'}
            </button>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-8 relative z-10">
            {previewMode === 'phone' ? (
              /* ── react-framify IPhoneFrame + live iframe overlay ── */
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%' }}>
                {/*
                  IPhoneFrame renders an <img zIndex=-1> inside a positioned shell.
                  We fix the figure's absolute positioning via a style override,
                  then absolutely overlay the live iframe + our own Dynamic Island
                  and status bar on top (zIndex > the device div's zIndex:10).

                  Known IPhoneFrame portrait dimensions:
                    outer device div: 250.38 × 507.5px, border 3px
                    inner ring div:   border 9px solid #000
                    visible screen:   top=12px left=15px w=226px h=484px
                    dynamic island:   top=19px, centered, 74×26px
                */}
                <div style={{ position:'relative' }}>
                  {/* CSS iPhone frame — exact same outer dims as react-framify IPhoneFrame */}
                  <div style={{
                    width: 250.38,
                    height: 507.5,
                    background: '#1c1c1e',
                    borderRadius: 44,
                    border: '3px solid #3a3a3c',
                    boxShadow: '0 0 0 1px #000, inset 0 0 0 1px #2c2c2e, 0 24px 64px rgba(0,0,0,0.7)',
                    position: 'relative',
                    boxSizing: 'border-box',
                  }}>
                    {/* Side buttons — volume up */}
                    <div style={{ position:'absolute', left:-5, top:100, width:4, height:28, background:'#3a3a3c', borderRadius:'2px 0 0 2px' }} />
                    {/* Side buttons — volume down */}
                    <div style={{ position:'absolute', left:-5, top:138, width:4, height:28, background:'#3a3a3c', borderRadius:'2px 0 0 2px' }} />
                    {/* Side buttons — power */}
                    <div style={{ position:'absolute', right:-5, top:120, width:4, height:56, background:'#3a3a3c', borderRadius:'0 2px 2px 0' }} />
                  </div>

                  {/* ── Live website content ── */}
                  {/*
                    Outer div: clips to the phone screen shape (226×484px).
                    Inner div: renders at real 430×932 (iPhone 14 Pro Max logical px),
                    then scaled down by 226/430 ≈ 0.5256 to fit.
                    position:absolute takes it out of flow so the 430px width
                    does not overflow/expand the 226px clip container.
                    The iframe inside fills 430×932 and handles its own scrolling.
                  */}
                  <div style={{
                    position:'absolute', top:12, left:12,
                    width:226, height:484,
                    overflow:'hidden', borderRadius:35,
                    zIndex:15,
                  }}>
                    <div style={{
                      position:'absolute', top:0, left:0,
                      width:430, height:932,
                      transform:`scale(${226/430})`,
                      transformOrigin:'top left',
                    }}>
                      <TemplateRenderer templateId={templateId} data={data} />
                    </div>
                    {/* Home indicator */}
                    <div style={{
                      position:'absolute', bottom:8, left:'50%',
                      transform:'translateX(-50%)',
                      width:68, height:4,
                      background:'rgba(255,255,255,0.3)',
                      borderRadius:100, zIndex:5,
                      pointerEvents:'none',
                    }} />
                  </div>

                  {/* ── Dynamic Island ── */}
                  <div style={{
                    position:'absolute', top:19, left:'50%',
                    transform:'translateX(-50%)',
                    width:74, height:26,
                    background:'#000', borderRadius:100,
                    zIndex:20, boxShadow:'0 2px 8px rgba(0,0,0,0.8)',
                  }} />

                  {/* ── Status bar ── */}
                  <div style={{
                    position:'absolute', top:12, left:12, width:226,
                    height:40, display:'flex', alignItems:'center',
                    justifyContent:'space-between',
                    paddingLeft:14, paddingRight:12, paddingTop:10,
                    zIndex:20, pointerEvents:'none',
                  }}>
                    <span style={{ color:'#fff', fontSize:12, fontWeight:700, letterSpacing:'-0.2px' }}>9:41</span>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                        <rect x="0"    y="8"   width="3" height="4"  rx="1" fill="#fff" opacity="0.4"/>
                        <rect x="4.7"  y="5.5" width="3" height="6.5" rx="1" fill="#fff" opacity="0.6"/>
                        <rect x="9.4"  y="3"   width="3" height="9"  rx="1" fill="#fff" opacity="0.8"/>
                        <rect x="14.1" y="0"   width="3" height="12" rx="1" fill="#fff"/>
                      </svg>
                      <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
                        <circle cx="7.5" cy="10.5" r="1.6" fill="#fff"/>
                        <path d="M4 7.3C5.3 5.8 6.3 5.2 7.5 5.2s2.2.6 3.5 2.1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                        <path d="M1.2 4.5C3.4 2 5.3.8 7.5.8s4.1 1.2 6.3 3.7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                      </svg>
                      <div style={{ display:'flex', alignItems:'center' }}>
                        <div style={{ width:22, height:11, border:'1.5px solid rgba(255,255,255,0.6)', borderRadius:3, padding:'1.5px', position:'relative' }}>
                          <div style={{ width:'75%', height:'100%', background:'#fff', borderRadius:1.5 }} />
                          <div style={{ position:'absolute', right:-3.5, top:'50%', transform:'translateY(-50%)', width:2.5, height:5, background:'rgba(255,255,255,0.5)', borderRadius:'0 1px 1px 0' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{ color:'#52525b', fontSize:'10px', marginTop:'14px', fontWeight:600, letterSpacing:'0.2em', textTransform:'uppercase' }}>
                  iPhone 14 Pro Max
                </p>
              </div>
            ) : (
              /* ── Premium Browser Frame ── */
              <div
                className="w-full h-full max-w-5xl flex flex-col rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 48px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5)',
                }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-3 px-4 py-3 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #1e1e28 0%, #16161e 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                  </div>
                  <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5 border border-white/5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="w-2.5 h-2.5 rounded-full border border-emerald-500/50 flex items-center justify-center shrink-0">
                      <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono truncate">{shareUrl}</span>
                  </div>
                </div>
                {/* Page */}
                <div className="flex-1 bg-white overflow-auto">
                  <TemplateRenderer templateId={templateId} data={data} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─────────── MOBILE TEMPLATE STRIP (preview tab only) ─────────── */}
      {mobileTab === 'preview' && (
        <div
          className="md:hidden shrink-0 overflow-x-auto flex gap-2.5 px-3 py-2.5"
          style={{
            background: 'rgba(10,10,15,0.97)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            scrollbarWidth: 'none',
          }}
        >
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => handleTemplateChange(tpl.id)}
              className="flex flex-col items-center gap-1 shrink-0 transition-all duration-200"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all"
                style={templateId === tpl.id
                  ? { borderColor: '#e8708a', background: 'rgba(232,112,138,0.15)', boxShadow: '0 0 12px rgba(232,112,138,0.3)' }
                  : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }
                }
              >
                {tpl.thumbnail}
              </div>
              <span
                className="text-[9px] font-bold tracking-wide whitespace-nowrap"
                style={{ color: templateId === tpl.id ? '#e8708a' : '#52525b' }}
              >
                {tpl.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─────────── MOBILE BOTTOM NAV ─────────── */}
      <div
        className="md:hidden flex items-stretch shrink-0 h-16"
        style={{
          background: 'rgba(10,10,15,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <button
          onClick={() => setMobileTab('edit')}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
          style={{ color: mobileTab === 'edit' ? '#e8708a' : '#52525b' }}
        >
          <div className="p-1.5 rounded-xl transition-all"
            style={mobileTab === 'edit' ? { background: 'rgba(232,112,138,0.12)' } : {}}>
            <Pencil size={18} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Edit</span>
        </button>

        <div className="w-px my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <button
          onClick={() => setMobileTab('preview')}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
          style={{ color: mobileTab === 'preview' ? '#e8708a' : '#52525b' }}
        >
          <div className="p-1.5 rounded-xl transition-all"
            style={mobileTab === 'preview' ? { background: 'rgba(232,112,138,0.12)' } : {}}>
            <Eye size={18} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Preview</span>
        </button>

        <div className="w-px my-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <button
          onClick={handleCopyLink}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
          style={{ color: copied ? '#10b981' : '#52525b' }}
        >
          <div className="p-1.5 rounded-xl transition-all"
            style={copied ? { background: 'rgba(16,185,129,0.12)' } : {}}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </div>
          <span className="text-[10px] font-bold tracking-wide">{copied ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
