import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users as UsersIcon,
  CalendarDays,
  Images,
  ChevronRight,
  Loader2,
  Search,
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

export default function Users() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('admin_get_users');
        if (error) throw error;
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token]);

  const filtered = users.filter(u =>
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.studio_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">
            System · Admin
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">{users.length} registered accounts</p>
        </div>
        <div className="relative mt-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search by email or studio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all w-72"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-teal-600" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
          <UsersIcon size={48} className="mb-4 opacity-20" />
          <p className="text-zinc-500 font-semibold">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 overflow-hidden">
          {filtered.map((u, i) => {
            const ps = u.top_plan ? (PLAN_STYLE[u.top_plan] ?? null) : null;
            return (
              <div
                key={u.id}
                onClick={() => navigate(`/users/${u.id}`)}
                className={`flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-zinc-50 transition-colors group ${i !== 0 ? 'border-t border-zinc-100' : ''}`}
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=00685f&color=fff&size=80`}
                  alt="avatar"
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 truncate">{u.full_name || u.email}</p>
                    {ps && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: ps.bg, color: ps.color }}>
                        {ps.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{u.email}</p>
                  {u.studio_name && (
                    <p className="text-xs text-teal-600 font-medium mt-0.5">{u.studio_name}</p>
                  )}
                </div>
                <div className="hidden md:flex items-center gap-5 shrink-0 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5"><CalendarDays size={13} className="text-teal-500" />{u.event_count} events</span>
                  <span className="flex items-center gap-1.5"><Images size={13} className="text-amber-500" />{u.photo_count} photos</span>
                  <span className="text-zinc-400">{fmtDate(u.created_at)}</span>
                </div>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-teal-500 transition-colors shrink-0 ml-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
