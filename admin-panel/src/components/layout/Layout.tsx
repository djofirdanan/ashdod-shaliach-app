import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/': 'לוח בקרה',
  '/deliveries': 'משלוחים',
  '/couriers': 'שליחים',
  '/businesses': 'עסקים',
  '/live-map': 'מפה חיה',
  '/pricing': 'תמחור',
  '/bonuses': 'בונוסים',
  '/reports': 'דוחות',
  '/settings': 'הגדרות',
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const title = PAGE_TITLES[location.pathname] || 'לוח בקרה';

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden" style={{ background: '#F0F4FF' }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode((d) => !d)}
        />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#F0F4FF' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
