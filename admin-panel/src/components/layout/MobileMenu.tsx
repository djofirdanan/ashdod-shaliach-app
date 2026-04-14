import React, { Fragment } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
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
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'לוח בקרה', icon: <HomeIcon className="w-5 h-5" /> },
  { path: '/deliveries', label: 'משלוחים', icon: <TruckIcon className="w-5 h-5" /> },
  { path: '/couriers', label: 'שליחים', icon: <UserGroupIcon className="w-5 h-5" /> },
  { path: '/businesses', label: 'עסקים', icon: <BuildingStorefrontIcon className="w-5 h-5" /> },
  { path: '/live-map', label: 'מפה חיה', icon: <MapPinIcon className="w-5 h-5" /> },
  { path: '/pricing', label: 'תמחור', icon: <CurrencyDollarIcon className="w-5 h-5" /> },
  { path: '/bonuses', label: 'בונוסים', icon: <GiftIcon className="w-5 h-5" /> },
  { path: '/reports', label: 'דוחות', icon: <ChartBarIcon className="w-5 h-5" /> },
  { path: '/settings', label: 'הגדרות', icon: <Cog6ToothIcon className="w-5 h-5" /> },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* Slide-in panel from right (RTL layout) */}
        <div className="fixed inset-0 flex justify-end">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel
              className="relative flex w-72 flex-col bg-white h-full"
              style={{ boxShadow: '-8px 0 40px rgba(124, 58, 237, 0.15)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
                  >
                    <TruckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight" style={{ color: '#1E1B4B' }}>
                      אשדוד-שליח
                    </p>
                    <p className="text-xs text-gray-400">פאנל ניהול</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="סגור תפריט"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 py-4 overflow-y-auto px-3">
                <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  ניהול
                </p>
                <ul className="space-y-0.5">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative',
                            isActive
                              ? 'nav-active font-semibold'
                              : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={clsx(
                                'flex-shrink-0 transition-colors',
                                isActive ? 'text-purple-600' : 'text-gray-400'
                              )}
                            >
                              {item.icon}
                            </span>
                            <span
                              className={clsx(
                                'text-sm',
                                isActive ? 'text-purple-700' : 'text-gray-600'
                              )}
                            >
                              {item.label}
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* User section */}
              <div className="border-t border-gray-100 p-3">
                <div className="flex items-center gap-3 p-2 rounded-xl">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    <span className="text-white font-bold text-sm">{firstLetter}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1E1B4B' }}>
                      {user?.name || 'מנהל'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email || 'admin@ashdod-shaliach.co.il'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="התנתק"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};
