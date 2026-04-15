import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import {
  HomeIcon,
  TruckIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import * as storageService from '../../services/storage.service';
import { DeliveryNotificationOverlay } from '../DeliveryNotificationOverlay';

const PAGE_TITLES: Record<string, string> = {
  '/': 'לוח בקרה',
  '/deliveries': 'משלוחים',
  '/couriers': 'שליחים',
  '/businesses': 'עסקים',
  '/chat': "צ'אט",
  '/live-map': 'מפה חיה',
  '/pricing': 'תמחור',
  '/bonuses': 'בונוסים',
  '/reports': 'דוחות',
  '/settings': 'הגדרות',
  '/dashboard': 'לוח בקרה',
};

const BOTTOM_NAV = [
  { path: '/dashboard', label: 'דשבורד', icon: <HomeIcon className="w-5 h-5" /> },
  { path: '/deliveries', label: 'משלוחים', icon: <TruckIcon className="w-5 h-5" /> },
  { path: '/chat', label: "צ'אט", icon: <ChatBubbleLeftRightIcon className="w-5 h-5" /> },
  { path: '/couriers', label: 'שליחים', icon: <UserGroupIcon className="w-5 h-5" /> },
  { path: '/businesses', label: 'עסקים', icon: <BuildingStorefrontIcon className="w-5 h-5" /> },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const calc = () => {
      const convs = storageService.getConversations();
      setChatUnread(convs.reduce((s, c) => s + c.unreadBusiness + c.unreadCourier, 0));
    };
    calc();
    const interval = setInterval(calc, 5000);
    return () => clearInterval(interval);
  }, []);

  const title = PAGE_TITLES[location.pathname] || 'לוח בקרה';

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden" style={{ background: '#F0F4FF' }}>
      {/* Sidebar — hidden on mobile by default */}
      <div className="hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          mobileOpen={false}
        />
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sidebar
          collapsed={false}
          onToggle={() => {}}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode((d) => !d)}
          onMenuToggle={() => setMobileSidebarOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pb-20 md:pb-6" style={{ background: '#F0F4FF' }}>
          <Outlet />
        </main>

        {/* Delivery notification overlay (shows only for couriers) */}
        <DeliveryNotificationOverlay />

        {/* Mobile bottom navigation */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-30 flex items-center justify-around px-2 pb-safe"
          style={{
            background: 'white',
            borderTop: '1px solid #e8ecf0',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
            height: 60,
          }}
        >
          {BOTTOM_NAV.map((item) => {
            const isChat = item.path === '/chat';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-purple-600' : 'text-gray-400'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <span style={{ color: isActive ? '#533afd' : '#9ca3af' }}>{item.icon}</span>
                      {isChat && chatUnread > 0 && (
                        <span
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                          style={{ background: '#ea2261' }}
                        >
                          {chatUnread > 9 ? '9+' : chatUnread}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: isActive ? '#533afd' : '#9ca3af' }}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
