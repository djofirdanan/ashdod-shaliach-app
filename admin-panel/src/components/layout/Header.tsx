import React, { useState } from 'react';
import {
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  time: string;
  isRead: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'warning', message: 'שליח #204 לא זמין כבר שעה', time: 'לפני 5 דקות', isRead: false },
  { id: '2', type: 'info',    message: 'משלוח ASH-X1F4 ממתין לשיבוץ', time: 'לפני 12 דקות', isRead: false },
  { id: '3', type: 'success', message: '47 משלוחים הושלמו היום', time: 'לפני שעה', isRead: true },
  { id: '4', type: 'warning', message: 'עסק "פיצה קינג" ביקש ביטול', time: 'לפני שעתיים', isRead: true },
];

interface HeaderProps {
  title: string;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuToggle,
}) => {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [searchValue, setSearchValue] = useState('');

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || 'A';

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const notifIcon = (type: Notification['type']) => {
    if (type === 'warning')
      return <ExclamationTriangleIcon className="w-4 h-4" style={{ color: '#f59e0b' }} />;
    if (type === 'success')
      return <CheckCircleIcon className="w-4 h-4" style={{ color: '#1db954' }} />;
    return <InformationCircleIcon className="w-4 h-4" style={{ color: '#533afd' }} />;
  };

  const notifBarColor = (type: Notification['type']) => {
    if (type === 'warning') return '#f59e0b';
    if (type === 'success') return '#1db954';
    return '#533afd';
  };

  return (
    <header
      className="h-[60px] flex items-center justify-between px-6 gap-4 flex-shrink-0 bg-white"
      style={{
        borderBottom: '1px solid #e8ecf0',
        boxShadow: '0 1px 3px rgba(50,50,93,0.05)',
      }}
    >
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3 min-w-0">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-[6px] transition-colors lg:hidden"
            style={{ color: '#6b7c93' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(83,58,253,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = '#533afd';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '';
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7c93';
            }}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1
            className="text-base font-bold truncate leading-tight tracking-tight"
            style={{ color: '#061b31' }}
          >
            {title}
          </h1>
          <p className="text-[11px] leading-none mt-0.5" style={{ color: '#8898aa' }}>
            אשדוד-שליח / {title}
          </p>
        </div>
      </div>

      {/* Center: search */}
      <div className="flex-1 max-w-[340px] hidden md:block">
        <div className="relative">
          <MagnifyingGlassIcon
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: '#8898aa' }}
          />
          <input
            type="text"
            placeholder="חפש משלוח, שליח, עסק..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-[13px] rounded-[6px] transition-all outline-none"
            style={{
              background: '#f6f9fc',
              border: '1px solid #e0e6ed',
              color: '#061b31',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#533afd';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(83,58,253,0.12)';
              e.currentTarget.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e0e6ed';
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.background = '#f6f9fc';
            }}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-[6px] transition-colors"
            style={{ color: '#6b7c93' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(83,58,253,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = '#533afd';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '';
              (e.currentTarget as HTMLButtonElement).style.color = '#6b7c93';
            }}
            aria-label="התראות"
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <>
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                  style={{ background: '#ea2261' }}
                />
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-ping opacity-75"
                  style={{ background: '#ea2261' }}
                />
              </>
            )}
          </button>

          {/* Dropdown */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div
                className="absolute left-0 top-full mt-2 w-[calc(100vw-24px)] max-w-[320px] bg-white rounded-[8px] z-50 overflow-hidden"
                style={{
                  boxShadow: '0 13px 27px -5px rgba(50,50,93,0.15), 0 8px 16px -8px rgba(0,0,0,0.10)',
                  border: '1px solid #e8ecf0',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #e8ecf0' }}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm" style={{ color: '#061b31' }}>התראות</h3>
                    {unreadCount > 0 && (
                      <span
                        className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #ea2261, #f96bee)' }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[12px] font-medium transition-colors"
                        style={{ color: '#533afd' }}
                      >
                        סמן הכל
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="p-0.5 rounded transition-colors"
                      style={{ color: '#8898aa' }}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="max-h-[280px] overflow-y-auto">
                  {notifications.map((n, idx) => (
                    <div
                      key={n.id}
                      className={clsx(
                        'flex items-start gap-3 px-4 py-3 relative transition-colors',
                        !n.isRead ? 'bg-[#f6f9fc]' : 'bg-white',
                        idx < notifications.length - 1 ? 'border-b border-[#f0f3f6]' : ''
                      )}
                      style={{ cursor: 'default' }}
                    >
                      {/* Left color bar */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-0.5"
                        style={{ background: !n.isRead ? notifBarColor(n.type) : 'transparent' }}
                      />
                      <div className="mt-0.5 flex-shrink-0">{notifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug font-medium" style={{ color: '#3c4257' }}>
                          {n.message}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#8898aa' }}>
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-2.5 text-center"
                  style={{ borderTop: '1px solid #e8ecf0', background: '#f8fafc' }}
                >
                  <button
                    className="text-[12px] font-medium transition-colors"
                    style={{ color: '#533afd' }}
                  >
                    צפה בכל ההתראות
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: '#e0e6ed' }} />

        {/* User */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-[6px] cursor-pointer transition-all">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            {firstLetter}
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold leading-none" style={{ color: '#061b31' }}>
              {user?.name || 'מנהל'}
            </p>
            <p className="text-[11px] leading-none mt-0.5" style={{ color: '#8898aa' }}>
              מנהל מערכת
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
