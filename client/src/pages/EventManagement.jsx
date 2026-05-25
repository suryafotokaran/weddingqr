import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import DashboardLayout from '../components/DashboardLayout';
import {
  Users, Plus, Search, Edit2, Trash2, X, ChevronDown,
  IndianRupee, Camera, Package, CreditCard, Truck, FileText,
  Phone, Mail, MapPin, Calendar, Clock, CheckSquare, Square,
  Loader2, Briefcase, BookOpen,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EMPTY = {
  client_name: '', bride_name: '', groom_name: '', phone: '', email: '', address: '',
  event_type: 'wedding', event_date: '', event_location: '', shoot_duration: '',
  package_name: '', package_price: '', services: [],
  promised_photos: '', promised_video_duration: '', album_count: '',
  total_amount: '', advance_paid: '', discount: '', payment_method: 'cash',
  delivery_date: '', delivery_status: 'pending', notes: '',
};

const SERVICES_LIST = [
  'Photography', 'Videography', 'Drone', 'Live Streaming',
  'Album', 'LED Wall', 'Candid Shoot', 'Pre Wedding', 'Post Wedding',
];

const EVENT_TYPE_LABELS = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  birthday: 'Birthday',
  reception: 'Reception',
  baby_shower: 'Baby Shower',
};

const EVENT_TYPE_COLORS = {
  wedding:    'bg-teal-100 text-teal-800',
  engagement: 'bg-rose-100 text-rose-800',
  birthday:   'bg-violet-100 text-violet-800',
  reception:  'bg-orange-100 text-orange-800',
  baby_shower:'bg-pink-100 text-pink-800',
};

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-800',
  editing:   'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
};

const STATUS_LABELS = { pending: 'Pending', editing: 'Editing', delivered: 'Delivered' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(val || 0);

const toNum = (v) => parseFloat(v) || 0;

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const AVATAR_COLORS = [
  'bg-teal-600', 'bg-rose-500', 'bg-violet-600',
  'bg-orange-500', 'bg-pink-500', 'bg-indigo-600',
];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ---------------------------------------------------------------------------
// Section header used inside drawer
// ---------------------------------------------------------------------------
function SectionHeading({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 pt-6 pb-3 border-t border-zinc-100">
      <Icon size={15} className="text-teal-600" />
      <span className="text-xs font-bold uppercase tracking-widest text-teal-700">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input helpers
// ---------------------------------------------------------------------------
function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-zinc-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white placeholder:text-zinc-400';
const selectCls = inputCls + ' appearance-none cursor-pointer';

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------
function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-zinc-200 overflow-hidden text-sm">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 font-medium transition-colors ${
            value === opt.value
              ? 'bg-teal-600 text-white'
              : 'bg-white text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function EventManagement() {
  const { data: userData } = useCurrentUser();
  const user = userData?.user;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Package manager state
  const [packages,        setPackages]        = useState([]);
  const [showPkgManager,  setShowPkgManager]  = useState(false);
  const [pkgForm,         setPkgForm]         = useState({ name: '', price: '', services: [], promised_photos: '', promised_video_duration: '', album_count: '', description: '' });
  const [editingPkgId,    setEditingPkgId]    = useState(null);
  const [savingPkg,       setSavingPkg]       = useState(false);
  const [deletePkgId,     setDeletePkgId]     = useState(null);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  async function fetchRecords() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('event_management')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }

  async function fetchPackages() {
    if (!user) return;
    const { data } = await supabase
      .from('packages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPackages(data ?? []);
  }

  useEffect(() => { fetchRecords(); fetchPackages(); }, [user]);

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------
  const analytics = useMemo(() => {
    const totalClients = records.length;
    const totalRevenue = records.reduce((s, r) => s + toNum(r.total_amount) - toNum(r.discount), 0);
    const collected = records.reduce((s, r) => s + toNum(r.advance_paid), 0);
    const pending = totalRevenue - collected;
    const statusCounts = { pending: 0, editing: 0, delivered: 0 };
    records.forEach(r => { if (statusCounts[r.delivery_status] !== undefined) statusCounts[r.delivery_status]++; });
    return { totalClients, totalRevenue, collected, pending, statusCounts };
  }, [records]);

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      const matchSearch = !q || [r.client_name, r.bride_name, r.groom_name, r.phone]
        .some(v => (v || '').toLowerCase().includes(q));
      const matchType = !filterType || r.event_type === filterType;
      const matchStatus = !filterStatus || r.delivery_status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [records, search, filterType, filterStatus]);

  // ---------------------------------------------------------------------------
  // Drawer helpers
  // ---------------------------------------------------------------------------
  function openNew() {
    setForm(EMPTY);
    setEditingId(null);
    setDrawerOpen(true);
  }

  function openEdit(record) {
    setForm({
      ...EMPTY,
      ...record,
      event_date: record.event_date ?? '',
      delivery_date: record.delivery_date ?? '',
      services: record.services ?? [],
      package_price: record.package_price ?? '',
      total_amount: record.total_amount ?? '',
      advance_paid: record.advance_paid ?? '',
      discount: record.discount ?? '',
      promised_photos: record.promised_photos ?? '',
      album_count: record.album_count ?? '',
    });
    setEditingId(record.id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleService(svc) {
    setForm(prev => {
      const arr = prev.services.includes(svc)
        ? prev.services.filter(s => s !== svc)
        : [...prev.services, svc];
      return { ...prev, services: arr };
    });
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  async function handleSave() {
    if (!form.client_name.trim()) return;
    setSaving(true);

    const payload = {
      client_name: form.client_name.trim(),
      bride_name: form.bride_name,
      groom_name: form.groom_name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      event_type: form.event_type,
      event_date: form.event_date || null,
      event_location: form.event_location,
      shoot_duration: form.shoot_duration,
      package_name: form.package_name,
      package_price: toNum(form.package_price),
      services: form.services,
      promised_photos: toNum(form.promised_photos),
      promised_video_duration: form.promised_video_duration,
      album_count: toNum(form.album_count),
      total_amount: toNum(form.total_amount),
      advance_paid: toNum(form.advance_paid),
      discount: toNum(form.discount),
      payment_method: form.payment_method,
      delivery_date: form.delivery_date || null,
      delivery_status: form.delivery_status,
      notes: form.notes,
    };

    if (editingId) {
      await supabase.from('event_management').update(payload).eq('id', editingId);
    } else {
      await supabase.from('event_management').insert({ ...payload, user_id: user.id });
    }

    setSaving(false);
    closeDrawer();
    fetchRecords();
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete(id) {
    await supabase.from('event_management').delete().eq('id', id);
    setDeleteConfirmId(null);
    fetchRecords();
  }

  // ---------------------------------------------------------------------------
  // Package CRUD
  // ---------------------------------------------------------------------------
  function openNewPkg() {
    setEditingPkgId(null);
    setPkgForm({ name: '', price: '', services: [], promised_photos: '', promised_video_duration: '', album_count: '', description: '' });
  }

  function openEditPkg(pkg) {
    setEditingPkgId(pkg.id);
    setPkgForm({
      name: pkg.name,
      price: String(pkg.price || ''),
      services: pkg.services || [],
      promised_photos: String(pkg.promised_photos || ''),
      promised_video_duration: pkg.promised_video_duration || '',
      album_count: String(pkg.album_count || ''),
      description: pkg.description || '',
    });
  }

  async function handleSavePkg() {
    if (!user || !pkgForm.name.trim()) return;
    setSavingPkg(true);
    const payload = {
      name: pkgForm.name.trim(),
      price: parseFloat(pkgForm.price) || 0,
      services: pkgForm.services,
      promised_photos: parseInt(pkgForm.promised_photos) || 0,
      promised_video_duration: pkgForm.promised_video_duration,
      album_count: parseInt(pkgForm.album_count) || 0,
      description: pkgForm.description,
    };
    if (editingPkgId) {
      await supabase.from('packages').update(payload).eq('id', editingPkgId).eq('user_id', user.id);
    } else {
      await supabase.from('packages').insert({ ...payload, user_id: user.id });
    }
    setSavingPkg(false);
    setEditingPkgId(null);
    setPkgForm({ name: '', price: '', services: [], promised_photos: '', promised_video_duration: '', album_count: '', description: '' });
    fetchPackages();
  }

  async function handleDeletePkg(id) {
    if (!user) return;
    await supabase.from('packages').delete().eq('id', id).eq('user_id', user.id);
    setDeletePkgId(null);
    fetchPackages();
  }

  function applyPackage(pkg) {
    setField('package_name', pkg.name);
    setField('package_price', String(pkg.price || ''));
    setField('services', pkg.services || []);
    setField('promised_photos', String(pkg.promised_photos || ''));
    setField('promised_video_duration', pkg.promised_video_duration || '');
    setField('album_count', String(pkg.album_count || ''));
  }

  function togglePkgService(svc) {
    setPkgForm(prev => {
      const arr = prev.services.includes(svc)
        ? prev.services.filter(s => s !== svc)
        : [...prev.services, svc];
      return { ...prev, services: arr };
    });
  }

  // ---------------------------------------------------------------------------
  // Derived payment values
  // ---------------------------------------------------------------------------
  const finalAmount = toNum(form.total_amount) - toNum(form.discount);
  const remainingBalance = finalAmount - toNum(form.advance_paid);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-1">Studio</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Event Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPkgManager(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 transition-colors active:scale-95"
            >
              <BookOpen size={16} /> Packages
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all hover:opacity-90 text-white"
              style={{ background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)' }}
            >
              <Plus size={16} /> Add Client
            </button>
          </div>
        </div>

        {/* Analytics cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Clients', value: analytics.totalClients, icon: Users, suffix: '', isCurrency: false },
            { label: 'Total Revenue', value: analytics.totalRevenue, icon: IndianRupee, suffix: '', isCurrency: true },
            { label: 'Collected', value: analytics.collected, icon: CreditCard, suffix: '', isCurrency: true },
            { label: 'Pending Balance', value: analytics.pending, icon: IndianRupee, suffix: '', isCurrency: true },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
                  <card.icon size={16} className="text-teal-600" />
                </div>
                <span className="text-xs font-semibold text-zinc-500">{card.label}</span>
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-zinc-900">
                {card.isCurrency ? fmt(card.value) : card.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Status summary row */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs font-semibold text-zinc-500 mr-1">Delivery:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            Pending <span className="bg-amber-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{analytics.statusCounts.pending}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            Editing <span className="bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{analytics.statusCounts.editing}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
            Delivered <span className="bg-green-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">{analytics.statusCounts.delivered}</span>
          </span>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by client, bride, groom or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-zinc-400"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="pl-3 pr-8 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none cursor-pointer"
            >
              <option value="">All Event Types</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="editing">Editing</option>
              <option value="delivered">Delivered</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="animate-spin text-teal-600" size={32} />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-5">
              <Briefcase size={36} className="text-teal-300" />
            </div>
            <p className="text-lg font-bold text-zinc-600 mb-1">No clients yet</p>
            <p className="text-sm mb-6 text-zinc-400">Add your first client to start managing events.</p>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all text-white"
              style={{ background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)' }}
            >
              <Plus size={14} /> Add Client
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <Search size={36} className="mb-3 opacity-30" />
            <p className="text-base font-semibold text-zinc-500">No results found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(record => {
              const balance = toNum(record.total_amount) - toNum(record.discount) - toNum(record.advance_paid);
              const isDeleteConfirm = deleteConfirmId === record.id;

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-5 group transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0 ${avatarColor(record.client_name)}`}>
                      {getInitials(record.client_name)}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: name + badges + actions */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-zinc-900 leading-tight truncate">{record.client_name}</h2>
                          {(record.bride_name || record.groom_name) && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {[record.bride_name, record.groom_name].filter(Boolean).join(' & ')}
                            </p>
                          )}
                          {record.phone && (
                            <a
                              href={`tel:${record.phone}`}
                              className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 mt-0.5"
                              onClick={e => e.stopPropagation()}
                            >
                              <Phone size={11} /> {record.phone}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${EVENT_TYPE_COLORS[record.event_type] || 'bg-zinc-100 text-zinc-700'}`}>
                            {EVENT_TYPE_LABELS[record.event_type] || record.event_type}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[record.delivery_status] || 'bg-zinc-100 text-zinc-700'}`}>
                            {STATUS_LABELS[record.delivery_status] || record.delivery_status}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: event date + package */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        {record.event_date && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Calendar size={12} /> {formatDate(record.event_date)}
                          </span>
                        )}
                        {record.package_name && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Package size={12} /> {record.package_name}
                            {record.package_price > 0 && <span className="font-semibold text-zinc-700 ml-1">{fmt(record.package_price)}</span>}
                          </span>
                        )}
                      </div>

                      {/* Row 3: payment summary */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-zinc-50">
                        <span className="text-xs text-zinc-500">
                          Total <span className="font-semibold text-zinc-700">{fmt(toNum(record.total_amount) - toNum(record.discount))}</span>
                        </span>
                        <span className="text-xs text-zinc-500">
                          Advance <span className="font-semibold text-teal-700">{fmt(record.advance_paid)}</span>
                        </span>
                        <span className="text-xs text-zinc-500">
                          Balance{' '}
                          <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {fmt(balance)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDeleteConfirm ? (
                        <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">
                          <span className="text-xs font-semibold text-red-700">Delete?</span>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs font-semibold text-zinc-600 hover:text-zinc-800 px-2 py-1 rounded-lg bg-white border border-zinc-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEdit(record)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(record.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --------------- Drawer overlay + panel --------------- */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={closeDrawer}
          />

          {/* Drawer panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-white z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-0.5">
                  {editingId ? 'Edit Client' : 'New Client'}
                </p>
                <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">
                  {editingId ? (form.client_name || 'Edit Client') : 'Add Client'}
                </h2>
              </div>
              <button
                onClick={closeDrawer}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">

              {/* ---- Client Details ---- */}
              <SectionHeading icon={Users} label="Client Details" />
              <div className="grid grid-cols-1 gap-3">
                <Field label="Client Name" required>
                  <input
                    type="text"
                    placeholder="e.g. Sharma Family"
                    value={form.client_name}
                    onChange={e => setField('client_name', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bride Name">
                    <input type="text" placeholder="Priya" value={form.bride_name} onChange={e => setField('bride_name', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Groom Name">
                    <input type="text" placeholder="Rahul" value={form.groom_name} onChange={e => setField('groom_name', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone Number">
                    <div className="relative">
                      <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setField('phone', e.target.value)} className={inputCls + ' pl-8'} />
                    </div>
                  </Field>
                  <Field label="Email">
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input type="email" placeholder="client@email.com" value={form.email} onChange={e => setField('email', e.target.value)} className={inputCls + ' pl-8'} />
                    </div>
                  </Field>
                </div>
                <Field label="Address">
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-3 text-zinc-400" />
                    <textarea
                      rows={2}
                      placeholder="Street, City, State"
                      value={form.address}
                      onChange={e => setField('address', e.target.value)}
                      className={inputCls + ' pl-8 resize-none'}
                    />
                  </div>
                </Field>
              </div>

              {/* ---- Event Details ---- */}
              <SectionHeading icon={Calendar} label="Event Details" />
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Event Type">
                    <div className="relative">
                      <select value={form.event_type} onChange={e => setField('event_type', e.target.value)} className={selectCls}>
                        <option value="wedding">Wedding</option>
                        <option value="engagement">Engagement</option>
                        <option value="birthday">Birthday</option>
                        <option value="reception">Reception</option>
                        <option value="baby_shower">Baby Shower</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="Event Date">
                    <div className="relative">
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input type="date" value={form.event_date} onChange={e => setField('event_date', e.target.value)} className={inputCls + ' pl-8'} />
                    </div>
                  </Field>
                </div>
                <Field label="Event Location">
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="text" placeholder="Venue name & city" value={form.event_location} onChange={e => setField('event_location', e.target.value)} className={inputCls + ' pl-8'} />
                  </div>
                </Field>
                <Field label="Shoot Time / Duration">
                  <div className="relative">
                    <Clock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="text" placeholder="e.g. 9 AM – 9 PM (12 hrs)" value={form.shoot_duration} onChange={e => setField('shoot_duration', e.target.value)} className={inputCls + ' pl-8'} />
                  </div>
                </Field>
              </div>

              {/* ---- Package Details ---- */}
              <SectionHeading icon={Package} label="Package Details" />
              <div className="grid grid-cols-1 gap-3">
                {packages.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">
                      Load from saved package
                    </label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                      defaultValue=""
                      onChange={e => {
                        const pkg = packages.find(p => p.id === e.target.value);
                        if (pkg) applyPackage(pkg);
                      }}
                    >
                      <option value="">— Select a package to auto-fill —</option>
                      {packages.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Package Name">
                    <input type="text" placeholder="Gold / Silver / Custom" value={form.package_name} onChange={e => setField('package_name', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Package Price (₹)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                      <input type="number" placeholder="0" min="0" value={form.package_price} onChange={e => setField('package_price', e.target.value)} className={inputCls + ' pl-7'} />
                    </div>
                  </Field>
                </div>

                <Field label="Included Services">
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {SERVICES_LIST.map(svc => {
                      const checked = form.services.includes(svc);
                      return (
                        <button
                          key={svc}
                          type="button"
                          onClick={() => toggleService(svc)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors text-left ${
                            checked
                              ? 'border-teal-400 bg-teal-50 text-teal-800'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          {checked
                            ? <CheckSquare size={14} className="text-teal-600 shrink-0" />
                            : <Square size={14} className="text-zinc-300 shrink-0" />
                          }
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Promised Photos">
                    <input type="number" placeholder="0" min="0" value={form.promised_photos} onChange={e => setField('promised_photos', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Video Duration">
                    <input type="text" placeholder="e.g. 10 min" value={form.promised_video_duration} onChange={e => setField('promised_video_duration', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Album Count">
                    <input type="number" placeholder="0" min="0" value={form.album_count} onChange={e => setField('album_count', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>

              {/* ---- Payment ---- */}
              <SectionHeading icon={CreditCard} label="Payment" />
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Total Amount (₹)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                      <input type="number" placeholder="0" min="0" value={form.total_amount} onChange={e => setField('total_amount', e.target.value)} className={inputCls + ' pl-7'} />
                    </div>
                  </Field>
                  <Field label="Advance Paid (₹)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                      <input type="number" placeholder="0" min="0" value={form.advance_paid} onChange={e => setField('advance_paid', e.target.value)} className={inputCls + ' pl-7'} />
                    </div>
                  </Field>
                  <Field label="Discount (₹)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                      <input type="number" placeholder="0" min="0" value={form.discount} onChange={e => setField('discount', e.target.value)} className={inputCls + ' pl-7'} />
                    </div>
                  </Field>
                </div>

                {/* Calculated read-only fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-zinc-500">Final Amount (auto)</label>
                    <div className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-bold text-zinc-800">
                      {fmt(finalAmount)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-zinc-500">Remaining Balance (auto)</label>
                    <div className={`px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(remainingBalance)}
                    </div>
                  </div>
                </div>

                <Field label="Payment Method">
                  <Segmented
                    value={form.payment_method}
                    onChange={v => setField('payment_method', v)}
                    options={[
                      { value: 'cash', label: 'Cash' },
                      { value: 'upi', label: 'UPI' },
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                    ]}
                  />
                </Field>
              </div>

              {/* ---- Delivery ---- */}
              <SectionHeading icon={Truck} label="Delivery" />
              <div className="grid grid-cols-1 gap-3">
                <Field label="Delivery Date">
                  <div className="relative">
                    <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="date" value={form.delivery_date} onChange={e => setField('delivery_date', e.target.value)} className={inputCls + ' pl-8'} />
                  </div>
                </Field>
                <Field label="Delivery Status">
                  <Segmented
                    value={form.delivery_status}
                    onChange={v => setField('delivery_status', v)}
                    options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'editing', label: 'Editing' },
                      { value: 'delivered', label: 'Delivered' },
                    ]}
                  />
                </Field>
              </div>

              {/* ---- Notes ---- */}
              <SectionHeading icon={FileText} label="Notes" />
              <textarea
                rows={3}
                placeholder="Any special instructions, requirements or notes..."
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                className={inputCls + ' resize-none'}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-white shrink-0">
              <button
                onClick={closeDrawer}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.client_name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)' }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                {saving ? 'Saving...' : (editingId ? 'Update Client' : 'Save Client')}
              </button>
            </div>
          </div>
        </>
      )}
      {/* --------------- Package Manager overlay + panel --------------- */}
      {showPkgManager && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setShowPkgManager(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-[460px] bg-white z-60 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-0.5">Studio</p>
                <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">Packages</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openNewPkg}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
                >
                  <Plus size={13} /> New Package
                </button>
                <button
                  onClick={() => setShowPkgManager(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">

              {/* Existing packages list */}
              {packages.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Saved Packages</p>
                  <div className="flex flex-col gap-2">
                    {packages.map(pkg => {
                      const isDeleteConfirm = deletePkgId === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-white hover:border-zinc-200 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-zinc-800 truncate">{pkg.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {fmt(pkg.price)}
                              {pkg.services && pkg.services.length > 0 && (
                                <span className="ml-2 text-zinc-400">· {pkg.services.length} service{pkg.services.length !== 1 ? 's' : ''}</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isDeleteConfirm ? (
                              <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-1.5">
                                <span className="text-xs font-semibold text-red-700">Delete?</span>
                                <button
                                  onClick={() => handleDeletePkg(pkg.id)}
                                  className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeletePkgId(null)}
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-800 px-2 py-1 rounded-lg bg-white border border-zinc-200 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEditPkg(pkg)}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletePkgId(pkg.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Create / Edit form */}
              <div className="mt-5">
                <div className="flex items-center gap-2 pt-4 pb-3 border-t border-zinc-100">
                  <Package size={15} className="text-teal-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-700">
                    {editingPkgId ? 'Edit Package' : 'New Package'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Field label="Package Name" required>
                    <input
                      type="text"
                      placeholder="e.g. Gold, Silver, Premium"
                      value={pkgForm.name}
                      onChange={e => setPkgForm(prev => ({ ...prev, name: e.target.value }))}
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Price (₹)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={pkgForm.price}
                        onChange={e => setPkgForm(prev => ({ ...prev, price: e.target.value }))}
                        className={inputCls + ' pl-7'}
                      />
                    </div>
                  </Field>

                  <Field label="Included Services">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {SERVICES_LIST.map(svc => {
                        const checked = pkgForm.services.includes(svc);
                        return (
                          <button
                            key={svc}
                            type="button"
                            onClick={() => togglePkgService(svc)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors text-left ${
                              checked
                                ? 'border-teal-400 bg-teal-50 text-teal-800'
                                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            {checked
                              ? <CheckSquare size={14} className="text-teal-600 shrink-0" />
                              : <Square size={14} className="text-zinc-300 shrink-0" />
                            }
                            {svc}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Promised Photos">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={pkgForm.promised_photos}
                        onChange={e => setPkgForm(prev => ({ ...prev, promised_photos: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Video Duration">
                      <input
                        type="text"
                        placeholder="e.g. 10 min"
                        value={pkgForm.promised_video_duration}
                        onChange={e => setPkgForm(prev => ({ ...prev, promised_video_duration: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Album Count">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={pkgForm.album_count}
                        onChange={e => setPkgForm(prev => ({ ...prev, album_count: e.target.value }))}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <Field label="Description">
                    <textarea
                      rows={3}
                      placeholder="Optional notes about this package..."
                      value={pkgForm.description}
                      onChange={e => setPkgForm(prev => ({ ...prev, description: e.target.value }))}
                      className={inputCls + ' resize-none'}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-white shrink-0">
              {editingPkgId && (
                <button
                  type="button"
                  onClick={() => { setEditingPkgId(null); setPkgForm({ name: '', price: '', services: [], promised_photos: '', promised_video_duration: '', album_count: '', description: '' }); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePkg}
                disabled={savingPkg || !pkgForm.name.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)' }}
              >
                {savingPkg ? <Loader2 size={15} className="animate-spin" /> : null}
                {savingPkg ? 'Saving...' : (editingPkgId ? 'Update Package' : 'Save Package')}
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
