import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  CalendarDays,
  Images,
  ShoppingBag,
  Lock,
  Globe,
  Loader2,
  Tag,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Camera,
} from 'lucide-react';

const PLAN_STYLE = {
  basic:   { bg: '#f3f3f4', color: '#3d4947', label: 'Starter'      },
  pro:     { bg: '#89f5e7', color: '#00685f', label: 'Professional' },
  premium: { bg: '#ffdbcf', color: '#85513e', label: 'Elite'        },
  custom:  { bg: '#e0e7ff', color: '#3730a3', label: 'Custom'       },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtAmount(paise) {
  if (!paise) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function StatusPill({ status }) {
  const map = {
    paid:    { icon: CheckCircle2, cls: 'text-teal-700 bg-teal-50',   label: 'Paid'    },
    pending: { icon: Clock,        cls: 'text-amber-700 bg-amber-50', label: 'Pending' },
    failed:  { icon: XCircle,      cls: 'text-red-600 bg-red-50',     label: 'Failed'  },
  };
  const cfg = map[status] ?? map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <Icon size={11} />{cfg.label}
    </span>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token || !id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: result, error: err } = await supabase.rpc('admin_get_user_detail', { p_user_id: id });
        if (err) throw err;
        setData(result);
      } catch (e) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token, id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="animate-spin text-teal-600" size={32} />
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>
    </div>
  );

  if (!data) return (
    <div className="max-w-4xl mx-auto py-32 text-zinc-500 text-center">User not found.</div>
  );

  const user      = data.user      ?? {};
  const events    = data.events    ?? [];
  const purchases = data.purchases ?? [];

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">

      {/* Back */}
      <button
        onClick={() => navigate('/users')}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-teal-600 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Users
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-8 flex items-center gap-6">
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.email || 'U')}&background=00685f&color=fff&size=128`}
          alt="avatar"
          className="w-20 h-20 rounded-2xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-1">User Account</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{user.full_name || 'No name set'}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>
          {user.studio_name && <p className="text-sm font-semibold text-teal-600 mt-1">{user.studio_name}</p>}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0 text-right">
          <p className="text-xs text-zinc-400">Joined {fmtDate(user.created_at)}</p>
          <div className="flex items-center gap-4 text-sm text-zinc-700">
            <span className="flex items-center gap-1.5 font-semibold"><CalendarDays size={14} className="text-teal-500" />{data.event_count} events</span>
            <span className="flex items-center gap-1.5 font-semibold"><Images size={14} className="text-amber-500" />{data.photo_count} photos</span>
            <span className="flex items-center gap-1.5 font-semibold"><ShoppingBag size={14} className="text-orange-500" />{data.purchase_count} purchases</span>
          </div>
        </div>
      </div>

      {/* Events */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">Events</h2>
          <span className="text-xs text-zinc-400 font-medium">{events.length} total</span>
        </div>
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 flex flex-col items-center justify-center py-16 text-zinc-400">
            <CalendarDays size={36} className="mb-3 opacity-20" />
            <p className="text-zinc-500 font-semibold">No events yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 overflow-hidden">
            {events.map((ev, i) => {
              const plan = ev.purchases?.plan ?? ev.plan_name ?? null;
              const ps   = plan ? (PLAN_STYLE[plan] ?? null) : null;
              return (
                <div key={ev.id} className={`flex items-center gap-4 px-6 py-5 ${i !== 0 ? 'border-t border-zinc-100' : ''}`}>
                  <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={19} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-zinc-900 truncate">{ev.name}</p>
                      {ps && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: ps.bg, color: ps.color }}>{ps.label}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                      <span className="flex items-center gap-1"><Tag size={11} />{ev.type}</span>
                      <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtDate(ev.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Camera size={11} /> {ev.photos_limit} limit
                    </span>
                    {ev.password ? (
                      <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-full flex items-center gap-1"><Lock size={11} /> Password set</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full flex items-center gap-1"><Globe size={11} />{ev.is_public ? 'Public' : 'Private'}</span>
                    )}
                    {ev.allow_download && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full flex items-center gap-1"><Download size={11} /> Downloads on</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Purchases */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">Purchase History</h2>
          <span className="text-xs text-zinc-400 font-medium">{purchases.length} total</span>
        </div>
        {purchases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 flex flex-col items-center justify-center py-16 text-zinc-400">
            <ShoppingBag size={36} className="mb-3 opacity-20" />
            <p className="text-zinc-500 font-semibold">No purchases yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span>Plan</span><span>Amount</span><span>Status</span><span>Date</span><span>Label</span>
            </div>
            {purchases.map((p, i) => {
              const ps = PLAN_STYLE[p.plan] ?? PLAN_STYLE.basic;
              return (
                <div key={p.id} className={`grid grid-cols-5 gap-4 px-6 py-4 items-center text-sm ${i !== 0 ? 'border-t border-zinc-100' : ''}`}>
                  <span className="font-bold px-2 py-0.5 rounded-full text-[11px] w-fit" style={{ background: ps.bg, color: ps.color }}>{ps.label}</span>
                  <span className="font-semibold text-zinc-900">{fmtAmount(p.amount_paise)}</span>
                  <StatusPill status={p.status} />
                  <span className="text-zinc-500 text-xs">{fmtDate(p.created_at)}</span>
                  <span className="text-zinc-400 text-xs truncate">{p.custom_label || '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
