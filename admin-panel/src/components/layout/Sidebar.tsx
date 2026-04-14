import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  TruckIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  GiftIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import * as storageService from '../../services/storage.service';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function useChatUnread() {
  const [count, setCount] = React.useState(0);
  useEffect(() => {
    const calc = () => {
      const convs = storageService.getConversations();
      setCount(convs.reduce((s, c) => s + c.unreadBusiness + c.unreadCourier, 0));
    };
    calc();
    const interval = setInterval(calc, 5000);
    return () => clearInterval(interval);
  }, []);
  return count;
}

const navItems: Omit<NavItem, 'badge'>[] = [
  { path: '/',            label: 'לוח בקרה',  icon: <HomeIcon className="w-4.5 h-4.5" /> },
  { path: '/deliveries',  label: 'משלוחים',   icon: <TruckIcon className="w-4.5 h-4.5" /> },
  { path: '/couriers',    label: 'שליחים',    icon: <UserGroupIcon className="w-4.5 h-4.5" /> },
  { path: '/businesses',  label: 'עסקים',     icon: <BuildingStorefrontIcon className="w-4.5 h-4.5" /> },
  { path: '/chat',        label: "צ'אט",      icon: <ChatBubbleLeftRightIcon className="w-4.5 h-4.5" /> },
  { path: '/live-map',    label: 'מפה חיה',   icon: <MapPinIcon className="w-4.5 h-4.5" /> },
  { path: '/pricing',     label: 'תמחור',     icon: <CurrencyDollarIcon className="w-4.5 h-4.5" /> },
  { path: '/bonuses',     label: 'בונוסים',   icon: <GiftIcon className="w-4.5 h-4.5" /> },
  { path: '/reports',     label: 'דוחות',     icon: <ChartBarIcon className="w-4.5 h-4.5" /> },
  { path: '/settings',    label: 'הגדרות',    icon: <Cog6ToothIcon className="w-4.5 h-4.5" /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen = false, onMobileClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chatUnread = useChatUnread();
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || 'A';

  // Close on route change on mobile
  const handleNavClick = () => {
    if (window.innerWidth < 768) onMobileClose?.();
  };

  const items: NavItem[] = navItems.map((item) => ({
    ...item,
    badge: item.path === '/chat' && chatUnread > 0 ? chatUnread : undefined,
  }));

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'flex flex-col h-screen transition-all duration-300 flex-shrink-0 relative z-30',
          // Desktop: normal collapsed behavior
          'md:relative md:translate-x-0',
          // Mobile: fixed, slides in/out from right (RTL)
          'fixed md:static inset-y-0 right-0',
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
          collapsed ? 'w-[64px]' : 'w-[240px]'
        )}
        style={{ background: '#061b31' }}
      >
        {/* Collapse toggle — desktop only */}
        <button
          onClick={onToggle}
          className="absolute -left-3 top-[72px] w-6 h-6 rounded-full hidden md:flex items-center justify-center z-10 transition-all hover:scale-110 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #533afd, #ea2261)',
            border: '2px solid #061b31',
          }}
          aria-label="Toggle sidebar"
        >
          {collapsed
            ? <ChevronLeftIcon className="w-3 h-3 text-white" />
            : <ChevronRightIcon className="w-3 h-3 text-white" />
          }
        </button>

        {/* Logo */}
        <div
          className={clsx(
            'flex items-center gap-3 flex-shrink-0',
            collapsed ? 'px-3 py-[18px] justify-center' : 'px-5 py-[18px]'
          )}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            <TruckIcon className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm leading-tight text-white whitespace-nowrap tracking-tight">
                אשדוד-שליח
              </p>
              <p className="text-[11px] whitespace-nowrap mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                פאנל ניהול
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {!collapsed && (
            <p
              className="px-5 mb-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'rgba(255,255,255,0.30)' }}
            >
              ניהול
            </p>
          )}
          <ul className={clsx('space-y-0.5', collapsed ? 'px-2' : 'px-2')}>
            {items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-[6px] transition-all duration-150 group relative',
                      collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5',
                      isActive ? 'nav-active' : ''
                    )
                  }
                  style={({ isActive }) =>
                    isActive ? {} : { color: 'rgba(255,255,255,0.55)' }
                  }
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    if (!el.classList.contains('nav-active')) {
                      el.style.background = 'rgba(255,255,255,0.06)';
                      el.style.color = 'rgba(255,255,255,0.85)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    if (!el.classList.contains('nav-active')) {
                      el.style.background = '';
                      el.style.color = 'rgba(255,255,255,0.55)';
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="flex-shrink-0 w-[18px] h-[18px] relative"
                        style={{ color: isActive ? '#a89bff' : 'inherit' }}
                      >
                        {item.icon}
                        {item.badge && item.badge > 0 && (
                          <span
                            className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                            style={{ background: '#ea2261' }}
                          >
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span className="text-[13.5px] font-medium whitespace-nowrap leading-none flex-1">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && item.badge && item.badge > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: '#ea2261' }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {/* Collapsed tooltip */}
                      {collapsed && (
                        <div
                          className="absolute left-full ml-3 px-3 py-1.5 text-white text-xs rounded-[6px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
                          style={{
                            background: '#1c1e54',
                            boxShadow: '0 7px 14px 0 rgba(50,50,93,0.10), 0 3px 6px 0 rgba(0,0,0,0.07)',
                            border: '1px solid rgba(83,58,253,0.25)',
                          }}
                        >
                          {item.label}
                          {item.badge ? ` (${item.badge})` : ''}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Live indicator */}
        {!collapsed && (
          <div
            className="mx-3 mb-3 px-3 py-2.5 rounded-[8px] flex items-center gap-2"
            style={{ background: 'rgba(83,58,253,0.12)', border: '1px solid rgba(83,58,253,0.20)' }}
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#533afd' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#533afd' }} />
            </span>
            <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
              מערכת פעילה
            </span>
          </div>
        )}

        {/* User section */}
        <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className={clsx(
              'flex items-center gap-2.5 px-2 py-2 rounded-[6px] cursor-pointer transition-all',
              collapsed && 'justify-center'
            )}
            style={{ color: 'rgba(255,255,255,0.55)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              {firstLetter}
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate leading-tight">
                    {user?.name || 'מנהל'}
                  </p>
                  <p className="text-[11px] truncate leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                    {user?.email || 'admin@ashdod-shaliach.co.il'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-[4px] transition-colors flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  title="התנתק"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,34,97,0.15)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#ea2261';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
                  }}
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
