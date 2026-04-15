import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { getPendingNotifications, getCourier, updateCourier, updateCourierLocation, getDeliveriesByCourier } from '../../services/storage.service';
import { DeliveryNotificationOverlay } from '../../components/DeliveryNotificationOverlay';
import {
  HomeIcon,
  BellIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CourierLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [pendingCount, setPendingCount] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [showAvailConfirm, setShowAvailConfirm] = useState(false);

  const refreshAvailability = useCallback(() => {
    if (!courierId) return;
    const c = getCourier(courierId);
    setIsAvailable(c?.isAvailable ?? true);
  }, [courierId]);

  useEffect(() => {
    const refresh = () => {
      if (courierId) setPendingCount(getPendingNotifications(courierId).length);
    };
    refresh();
    refreshAvailability();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [courierId, refreshAvailability]);

  // Share live location when courier has an active delivery
  useEffect(() => {
    if (!courierId || !navigator.geolocation) return;
    const shareLocation = () => {
      const deliveries = getDeliveriesByCourier(courierId);
      const hasActive = deliveries.some((d) => d.status === 'accepted' || d.status === 'picked_up');
      if (!hasActive) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => updateCourierLocation(courierId, pos.coords.latitude, pos.coords.longitude),
        () => {},
        { timeout: 5000, enableHighAccuracy: true }
      );
    };
    shareLocation();
    const locId = setInterval(shareLocation, 30_000);
    return () => clearInterval(locId);
  }, [courierId]);

  const handleToggleAvailability = () => {
    setShowAvailConfirm(true); // always show confirmation first
  };

  const confirmToggleAvailability = () => {
    if (!courierId) return;
    const next = !isAvailable;
    updateCourier(courierId, { isAvailable: next });
    setIsAvailable(next);
    setShowAvailConfirm(false);
    toast.success(next ? '🟢 אתה זמין לקבל משלוחים' : '🔴 סימנת את עצמך כלא זמין');
  };

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
        <div className="flex items-center gap-2">
          {/* Availability toggle */}
          <button
            onClick={handleToggleAvailability}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
            style={{
              background: isAvailable ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${isAvailable ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)'}`,
              color: isAvailable ? '#34d399' : '#f87171',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: isAvailable ? '#10b981' : '#ef4444' }}
            />
            {isAvailable ? 'זמין' : 'לא זמין'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4 text-white" />
          </button>
        </div>
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

      {/* Delivery popup overlay */}
      <DeliveryNotificationOverlay />

      {/* Availability confirmation dialog */}
      {showAvailConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAvailConfirm(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
            dir="rtl"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-[28px]"
              style={{ background: isAvailable ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}
            >
              {isAvailable ? '🔴' : '🟢'}
            </div>
            <h3 className="text-[17px] font-black mb-2" style={{ color: '#061b31' }}>
              {isAvailable ? 'סימון כלא זמין?' : 'סימון כזמין?'}
            </h3>
            <p className="text-[13px] mb-5" style={{ color: '#8898aa' }}>
              {isAvailable
                ? 'לא תקבל משלוחים חדשים כל עוד אתה מסומן כלא זמין'
                : 'תתחיל לקבל התראות על משלוחים חדשים'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAvailConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-[14px]"
                style={{ background: '#f0f4f8', color: '#8898aa' }}
              >
                ביטול
              </button>
              <button
                onClick={confirmToggleAvailability}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] text-white"
                style={{ background: isAvailable ? '#ef4444' : '#10b981' }}
              >
                {isAvailable ? 'אשר — לא זמין' : 'אשר — זמין'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierLayout;
