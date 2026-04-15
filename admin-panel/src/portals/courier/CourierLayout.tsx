import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { getPendingNotifications } from '../../services/storage.service';
import {
  HomeIcon,
  BellIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      if (courierId) setPendingCount(getPendingNotifications(courierId).length);
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [courierId]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItems = [
    { label: 'ראשי', path: '/courier/dashboard', icon: HomeIcon, badge: 0 },
    { label: 'פנויים', path: '/courier/available', icon: BellIcon, badge: pendingCount },
    { label: 'משלוחים', path: '/courier/deliveries', icon: TruckIcon, badge: 0 },
    { label: 'צ׳אט', path: '/courier/chat', icon: ChatBubbleLeftRightIcon, badge: 0 },
    { label: 'פרופיל', path: '/courier/profile', icon: UserCircleIcon, badge: 0 },
  ];

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: '#f6f9fc' }}>
      {/* Top header */}
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-40"
        style={{
          background: 'linear-gradient(135deg, #061b31, #1c1e54)',
          boxShadow: '0 2px 12px rgba(6,27,49,0.35)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            <TruckIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-[14px] leading-tight">אשדוד-שליח</p>
            <p className="text-white/60 text-[11px]">{user?.name ?? 'פורטל שליחים'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 text-white" />
          <span className="text-white text-[12px] font-semibold">יציאה</span>
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 right-0 left-0 z-40 flex items-center justify-around py-2"
        style={{
          background: '#ffffff',
          borderTop: '1px solid #e8ecf0',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {navItems.map(({ label, path, icon: Icon, badge }) => {
          const active = location.pathname === path ||
            (path === '/courier/dashboard' && location.pathname === '/courier');
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 relative min-w-[52px] py-1"
            >
              <div className="relative">
                <Icon
                  className="w-6 h-6 transition-colors"
                  style={{ color: active ? '#533afd' : '#8898aa' }}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1 -left-1 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                    style={{ background: '#ea2261' }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: active ? '#533afd' : '#8898aa' }}
              >
                {label}
              </span>
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: '#533afd' }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default CourierLayout;
