import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Globe,
  Database,
  Settings,
  X,
} from 'lucide-react';

const navItems = [
  { name: 'Overview', icon: LayoutDashboard, path: '/admin/studio' },
  { name: 'Events', icon: CalendarDays, path: '/admin/events' },
  { name: 'Management', icon: Briefcase, path: '/admin/management' },
  { name: 'Website', icon: Globe, path: '/admin/website-cms' },
  { name: 'R2 Storage', icon: Database, path: '/admin/r2-storage' },
];

export default function MobileSidebar({ isOpen, onClose, studioName }) {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-72 bg-white shadow-2xl lg:hidden transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <img
              src="/fotokaran-logo.png"
              alt="Fotokaran Studio"
              className="h-8 w-8 rounded-lg object-cover bg-zinc-900"
            />
            <div>
              <h3 className="text-sm font-bold text-teal-900 tracking-tight leading-tight">
                {studioName}
              </h3>
              <p className="text-xs text-zinc-500">Photography Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <div className="px-3 pt-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname.startsWith(item.path) ||
              (item.path === '/admin/events' &&
                location.pathname === '/admin/createevent');
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => go(item.path)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-orange-100 text-orange-900'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-teal-700' : ''} />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Settings — pinned to bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-6 pt-3 bg-white border-t border-zinc-100">
          <button
            onClick={() => go('/admin/profile')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150 ${
              location.pathname === '/admin/profile'
                ? 'bg-orange-100 text-orange-900'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Settings
              size={20}
              className={
                location.pathname === '/admin/profile' ? 'text-teal-700' : ''
              }
            />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
