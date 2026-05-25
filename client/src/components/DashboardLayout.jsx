import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import {
  LayoutDashboard,
  CloudUpload,
  Users,
  ShoppingCart,
  User,
  Settings,
  CalendarDays,
  Receipt,
  Globe,
  Database,
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userData } = useCurrentUser();
  const studioName = userData?.studioName ?? 'WeddingQR Studio';
  const fullName = userData?.fullName ?? 'Photographer';
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/admin/studio' },
    { name: 'Events', icon: CalendarDays, path: '/admin/events' },
    { name: 'Website', icon: Globe, path: '/admin/website-cms' },
    { name: 'R2 Storage', icon: Database, path: '/admin/r2-storage' },
  ];

  return (
    <div className="text-zinc-900 bg-zinc-50 min-h-screen">
      {/* TopNavBar */}
      <div className="fixed top-0 z-50 w-full px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(26,28,28,0.04)]">
        <div className="flex items-center gap-12">
          <span className="text-xl font-semibold tracking-tighter text-teal-800">{studioName}</span>
          <div className="hidden md:flex items-center space-x-8 text-sm tracking-tight">
            <a className={`font-bold transition-colors ${location.pathname === '/admin/studio' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-zinc-500 hover:text-teal-600'}`} href="/admin/studio">Dashboard</a>
            <a className="text-zinc-500 font-medium hover:text-teal-600 transition-colors" href="#">Galleries</a>
            <a className="text-zinc-500 font-medium hover:text-teal-600 transition-colors" href="#">Clients</a>
            <a className="text-zinc-500 font-medium hover:text-teal-600 transition-colors" href="#">Settings</a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/admin/createevent')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md active:scale-95 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)', color: '#ffffff' }}
          >
            <CalendarDays size={15} />
            Create Event
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center focus:outline-none"
            >
              <img
                alt="Photographer Profile"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent hover:ring-teal-500 transition-all cursor-pointer"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8B4E&color=fff`}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-zinc-100 py-2 z-50 overflow-hidden transform opacity-100 scale-100 transition-all duration-200 origin-top-right">
                <button
                  onClick={() => { setShowDropdown(false); navigate('/admin/profile'); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:text-teal-700 transition-colors flex items-center gap-2"
                >
                  <User size={16} />
                  Profile
                </button>
                <div className="h-px bg-zinc-100 my-1"></div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-screen pt-24">
        {/* SideNavBar */}
        <aside className="hidden lg:flex flex-col w-64 h-[calc(100vh-6rem)] p-4 space-y-2 bg-zinc-50 sticky top-24">
          <div className="mb-8 px-4">
            <h3 className="text-lg font-bold text-teal-900 tracking-tight">{studioName}</h3>
            <p className="text-xs text-zinc-500">Photography Studio</p>
          </div>

          {navItems.map((item) => {
            const isActive = item.path !== '#' && (
              location.pathname.startsWith(item.path) ||
              (item.path === '/admin/events' && location.pathname === '/admin/createevent')
            );
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-transform duration-200 ${isActive
                  ? 'bg-orange-100 text-orange-900 active:scale-[0.98]'
                  : 'text-zinc-600 hover:bg-zinc-200/50 hover:translate-x-1'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-teal-700' : ''} />
                {item.name}
              </button>
            );
          })}

          <div className="mt-auto p-4 border-t border-zinc-200/50">
            <button
              onClick={() => navigate('/admin/profile')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-transform duration-200 ${location.pathname === '/admin/profile'
                ? 'bg-orange-100 text-orange-900 active:scale-[0.98]'
                : 'text-zinc-600 hover:bg-zinc-200/50 hover:translate-x-1'
                }`}
            >
              <Settings size={20} className={location.pathname === '/admin/profile' ? 'text-teal-700' : ''} />
              Settings
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-8 pb-12 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
