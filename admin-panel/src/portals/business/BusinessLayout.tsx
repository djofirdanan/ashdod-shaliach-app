import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';
import { getUnreadCount, getBusiness } from '../../services/storage.service';
import {
  HomeIcon,
  PlusCircleIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  TruckIcon as TruckIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UserCircleIcon as UserIconSolid,
  PlusCircleIcon as PlusIconSolid,
} from '@heroicons/react/24/solid';

const navItems = [
  { label: 'ראשי',       path: '/business/dashboard',    icon: HomeIcon,                iconSolid: HomeIconSolid  },
  { label: 'משלוח חדש', path: '/business/new-delivery', icon: PlusCircleIcon,          iconSolid: PlusIconSolid  },
  { label: 'משלוחים',   path: '/business/deliveries',   icon: TruckIcon,              iconSolid: TruckIconSolid },
  { label: 'צ׳אט',      path: '/business/chat',         icon: ChatBubbleLeftRightIcon, iconSolid: ChatIconSolid  },
  { label: 'פרופיל',    path: '/business/profile',      icon: UserCircleIcon,          iconSolid: UserIconSolid  },
];

const BLUE = '#009DE0';

const BusinessLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [unread, setUnread]   = useState(0);
  const [bizName, setBizName] = useState('');

  useEffect(() => {
    const refresh = () => {
      if (businessId) {
        setUnread(getUnreadCount(businessId, 'business'));
        const biz = getBusiness(businessId);
        if (biz) setBizName(biz.businessName);
      }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [businessId]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: '#F4F4F4' }}>

      {/* ── Top header ── */}
      <header
        className="flex items-center justify-between px-4 sticky top-0 z-40"
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E8E8E8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: 56,
        }}
      >
        {/* Right: logo + name */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: BLUE }}
          >
            <TruckIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-black text-[15px] leading-tight" style={{ color: '#202125' }}>
              {bizName || user?.name || 'אשדוד-שליח'}
            </p>
            <p className="text-[11px]" style={{ color: '#757575' }}>פורטל עסקים</p>
          </div>
        </div>

        {/* Left: logout */}
        <button
          onClick={handleLogout}
          className="text-[13px] font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
          style={{ color: BLUE, background: '#EAF7FD', border: `1px solid ${BLUE}30` }}
        >
          יציאה
        </button>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* ── Bottom navigation ── */}
      <nav
        className="fixed bottom-0 right-0 left-0 z-40 flex items-center justify-around"
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #E8E8E8',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
          height: 60,
        }}
      >
        {navItems.map(({ label, path, icon: Icon, iconSolid: IconSolid }) => {
          const active = location.pathname === path ||
            (path === '/business/dashboard' && location.pathname === '/business');
          const isChat = path === '/business/chat';
          const isNew  = path === '/business/new-delivery';
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 relative min-w-[52px] py-1.5"
            >
              {/* "New delivery" gets a raised blue circle (Wolt-style FAB) */}
              {isNew ? (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center -mt-6 shadow-lg transition-all active:scale-95"
                  style={{ background: BLUE }}
                >
                  <IconSolid className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="relative">
                  {active
                    ? <IconSolid className="w-6 h-6" style={{ color: BLUE }} />
                    : <Icon      className="w-6 h-6" style={{ color: '#AAAAAA' }} />
                  }
                  {isChat && unread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                      style={{ background: '#E23437' }}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
              )}
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? BLUE : '#AAAAAA', marginTop: isNew ? 2 : 0 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BusinessLayout;
