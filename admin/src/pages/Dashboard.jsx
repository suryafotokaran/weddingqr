import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Users,
  Image as ImageIcon,
  Briefcase,
  LogOut,
  Search,
  Bell,
  Shield,
  Settings,
  ShoppingBag,
} from 'lucide-react';

import UsersPage from './Users';
import UserDetailPage from './UserDetail';
import PlansPage from './Plans';

function StatusPill({ status }) {
  const map = {
    paid: { cls: 'text-teal-700 bg-teal-50', label: 'Success' },
    pending: { cls: 'text-amber-700 bg-amber-50', label: 'Pending' },
    failed: { cls: 'text-red-600 bg-red-50', label: 'Failed' },
  };
  const cfg = map[status] ?? map.pending;
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PLAN_LABEL = { basic: 'Starter', pro: 'Professional', premium: 'Elite', custom: 'Custom' };
const PLAN_STYLE = {
  basic:   { bg: 'bg-zinc-100',   color: 'text-zinc-600'   },
  pro:     { bg: 'bg-teal-50',    color: 'text-teal-700'   },
  premium: { bg: 'bg-orange-50',  color: 'text-orange-700' },
  custom:  { bg: 'bg-indigo-50',  color: 'text-indigo-700' },
};

function Overview() {
  const { session } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentReg, setRecentReg] = useState([]);
  const [recentPaid, setRecentPaid] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('admin_get_stats');
        if (error) throw error;
        setStats({
          totalUsers:      data.totalUsers,
          totalEvents:     data.totalEvents,
          activePlanUsers: data.activePlanUsers,
          paidNoEvent:     data.paidNoEvent,
        });
        setRecentReg(data.recentReg   ?? []);
        setRecentPaid(data.recentPaid ?? []);
      } catch (e) {
        console.error('admin_get_stats failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token]);

  const STAT_CARDS = [
    { label: 'Total Signed Users',    value: stats?.totalUsers,      icon: Users,     bgClass: 'bg-teal-50',    iconClass: 'text-teal-600'   },
    { label: 'Active Plan Users',     value: stats?.activePlanUsers, icon: Briefcase, bgClass: 'bg-orange-50',  iconClass: 'text-orange-600' },
    { label: 'Total Events Created',  value: stats?.totalEvents,     icon: ImageIcon, bgClass: 'bg-amber-50',   iconClass: 'text-amber-600'  },
    { label: 'Paid · No Event Yet',   value: stats?.paidNoEvent,     icon: Shield,    bgClass: 'bg-rose-50',    iconClass: 'text-rose-500'   },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <header className="mb-10">
        <p className="text-amber-700 font-bold tracking-[0.05em] text-[10px] uppercase mb-2">System Overview</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Dashboard</h1>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {STAT_CARDS.map((stat, i) => (
          <div key={i} className="bg-white p-7 rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 hover:-translate-y-1 transition-all duration-300">
            <div className={`w-11 h-11 rounded-xl ${stat.bgClass} flex items-center justify-center mb-5`}>
              <stat.icon size={20} className={stat.iconClass} />
            </div>
            <p className="text-xs font-medium text-zinc-500 mb-1">{stat.label}</p>
            <h3 className={`text-3xl font-extrabold tracking-tight ${loading ? 'text-zinc-300 animate-pulse' : 'text-zinc-900'}`}>
              {loading ? '…' : String(stat.value ?? 0)}
            </h3>
          </div>
        ))}
      </section>

      {/* Two-column activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* Recent Registrations */}
        <section className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-6 flex flex-col">
          <h2 className="text-base font-bold tracking-tight text-zinc-900 mb-4">Recent Registrations</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
          ) : recentReg.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No users yet.</p>
          ) : (
            <div className="space-y-1 flex-1">
              {recentReg.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || u.email)}&background=00685f&color=fff&size=64`}
                    className="w-9 h-9 rounded-xl object-cover shrink-0" alt="avatar"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-zinc-400 truncate">{u.full_name ? u.email : fmtDate(u.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-semibold text-zinc-500">{u.event_count} events</p>
                    <StatusPill status={u.purchase_count > 0 ? 'paid' : 'pending'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Paid */}
        <section className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(26,28,28,0.04)] border border-zinc-100 p-6 flex flex-col">
          <h2 className="text-base font-bold tracking-tight text-zinc-900 mb-4">Recent Payments</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
          ) : recentPaid.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No payments yet.</p>
          ) : (
            <div className="space-y-1 flex-1">
              {recentPaid.map((p, i) => {
                const ps = PLAN_STYLE[p.plan] ?? PLAN_STYLE.basic;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.email)}&background=b45309&color=fff&size=64`}
                      className="w-9 h-9 rounded-xl object-cover shrink-0" alt="avatar"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 text-sm truncate">{p.full_name || p.email}</p>
                      <p className="text-xs text-zinc-400 truncate">{fmtDate(p.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ps.bg} ${ps.color}`}>
                        {PLAN_LABEL[p.plan] ?? p.plan}
                      </span>
                      <span className="text-xs font-semibold text-zinc-700">₹{Math.round(p.amount_paise / 100).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      <footer className="py-8 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-400 font-medium">© 2025 WeddingQR · Admin Console</p>
      </footer>
    </div>
  );
}


/* ─── Nav items ─────────────────────────────────────────────────── */
const NAV = [
  { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Users',    icon: Users,           path: '/users'     },
  { name: 'Plans',    icon: ShoppingBag,     path: '/plans'     },
  { name: 'Galleries',icon: ImageIcon,       path: '#'          },
];


export default function Dashboard({ page }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const renderPage = () => {
    if (page === 'users')       return <UsersPage />;
    if (page === 'user-detail') return <UserDetailPage />;
    if (page === 'plans')       return <PlansPage />;
    return <Overview />;
  };

  return (
    <div className="text-zinc-900 bg-zinc-50 min-h-screen">

      {/* ── Top Navbar ── */}
      <nav className="fixed top-0 z-50 w-full px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(26,28,28,0.04)]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow"
            style={{ background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)' }}
          >
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tighter text-teal-800">WeddingQR Admin</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search resources…"
              className="pl-10 pr-5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all w-60"
            />
          </div>
          <button className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm">
            <Bell size={18} />
          </button>
          <img
            alt="Admin"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent hover:ring-teal-500 transition-all cursor-pointer"
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email ?? 'Admin')}&background=00685f&color=fff`}
          />
        </div>
      </nav>

      <div className="flex min-h-screen pt-[72px]">

        {/* ── Left Sidebar ── */}
        <aside className="hidden lg:flex flex-col w-64 h-[calc(100vh-72px)] p-4 space-y-1 bg-zinc-50 sticky top-[72px] border-r border-zinc-200/60">
          <div className="mb-6 px-4 pt-2">
            <h3 className="text-base font-bold text-teal-900 tracking-tight">Admin Console</h3>
            <p className="text-xs text-zinc-500 mt-0.5">System Management</p>
          </div>

          {NAV.map((item) => {
            const isActive = item.path !== '#' && location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => item.path !== '#' && navigate(item.path)}
                disabled={item.path === '#'}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left ${item.path === '#'
                    ? 'text-zinc-300 cursor-not-allowed'
                    : isActive
                      ? 'bg-orange-100 text-orange-900'
                      : 'text-zinc-600 hover:bg-zinc-200/50 hover:translate-x-1'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-teal-700' : ''} />
                {item.name}
                {item.path === '#' && <span className="ml-auto text-[9px] font-bold text-zinc-300 uppercase">Soon</span>}
              </button>
            );
          })}

          <div className="mt-auto pt-4 border-t border-zinc-200/60">
            <button
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-200/50 hover:translate-x-1 transition-all duration-200"
            >
              <Settings size={18} /> Settings
            </button>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 active:scale-95"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 px-8 pb-12 overflow-x-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
