import React from 'react';
import { EyeIcon, NoSymbolIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Table, Pagination } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Courier, Business } from '../../types';
import { formatPhone, formatDate, formatCurrency } from '../../utils/formatters';
import { VEHICLE_TYPE_LABELS } from '../../utils/constants';
import clsx from 'clsx';

// ─── Courier List ───────────────────────────────────────────────────────────

interface CourierListProps {
  couriers: Courier[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails: (courier: Courier) => void;
  onToggleBlock: (courier: Courier) => void;
}

export const CourierList: React.FC<CourierListProps> = ({
  couriers,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onViewDetails,
  onToggleBlock,
}) => {
  const columns = [
    {
      key: 'name',
      header: 'שליח',
      render: (c: Courier) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#6C63FF] font-bold text-sm">{c.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
            <p className="text-xs text-gray-400">{formatPhone(c.phone)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'רכב',
      render: (c: Courier) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {VEHICLE_TYPE_LABELS[c.vehicle] || c.vehicle}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'דירוג',
      render: (c: Courier) => (
        <div className="flex items-center gap-1">
          <StarIcon className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'activeDeliveries',
      header: 'פעיל',
      render: (c: Courier) => (
        <span
          className={clsx(
            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
            c.activeDeliveries > 0
              ? 'bg-[#6C63FF]/15 text-[#6C63FF]'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
          )}
        >
          {c.activeDeliveries}
        </span>
      ),
    },
    {
      key: 'totalDeliveries',
      header: 'סה"כ משלוחים',
      render: (c: Courier) => (
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.totalDeliveries.toLocaleString()}</span>
      ),
    },
    {
      key: 'earnings',
      header: 'הכנסות',
      render: (c: Courier) => (
        <span className="text-sm font-semibold text-[#6C63FF]">{formatCurrency(c.earnings.total)}</span>
      ),
    },
    {
      key: 'status',
      header: 'סטטוס',
      render: (c: Courier) => (
        <Badge color={c.isBlocked ? 'red' : c.isActive ? 'green' : 'gray'} dot>
          {c.isBlocked ? 'חסום' : c.isActive ? 'פעיל' : 'לא פעיל'}
        </Badge>
      ),
    },
    {
      key: 'joinedAt',
      header: 'הצטרף',
      render: (c: Courier) => (
        <span className="text-xs text-gray-500">{formatDate(c.joinedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'פעולות',
      render: (c: Courier) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewDetails(c)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title="הצג פרטים"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleBlock(c)}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              c.isBlocked
                ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
                : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
            )}
            title={c.isBlocked ? 'בטל חסימה' : 'חסום'}
          >
            {c.isBlocked ? <CheckCircleIcon className="w-4 h-4" /> : <NoSymbolIcon className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <Table
        columns={columns}
        data={couriers}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="לא נמצאו שליחים"
        onRowClick={onViewDetails}
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

// ─── Business List ───────────────────────────────────────────────────────────

interface BusinessListProps {
  businesses: Business[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails: (business: Business) => void;
  onToggleBlock: (business: Business) => void;
}

export const BusinessList: React.FC<BusinessListProps> = ({
  businesses,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onViewDetails,
  onToggleBlock,
}) => {
  const columns = [
    {
      key: 'name',
      header: 'עסק',
      render: (b: Business) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FF6584]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#FF6584] font-bold text-sm">{b.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{b.name}</p>
            <p className="text-xs text-gray-400">{b.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'טלפון',
      render: (b: Business) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatPhone(b.phone)}</span>
      ),
    },
    {
      key: 'address',
      header: 'כתובת',
      render: (b: Business) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs block">
          {b.address.street}, {b.address.city}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'דירוג',
      render: (b: Business) => (
        <div className="flex items-center gap-1">
          <StarIcon className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">{b.rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'totalDeliveries',
      header: 'משלוחים',
      render: (b: Business) => (
        <span className="text-sm font-semibold">{b.totalDeliveries.toLocaleString()}</span>
      ),
    },
    {
      key: 'balance',
      header: 'יתרה',
      render: (b: Business) => (
        <span className={clsx('text-sm font-semibold', b.balance >= 0 ? 'text-green-600' : 'text-red-500')}>
          {formatCurrency(b.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'סטטוס',
      render: (b: Business) => (
        <Badge color={b.isBlocked ? 'red' : b.isActive ? 'green' : 'gray'} dot>
          {b.isBlocked ? 'חסום' : b.isActive ? 'פעיל' : 'לא פעיל'}
        </Badge>
      ),
    },
    {
      key: 'joinedAt',
      header: 'הצטרף',
      render: (b: Business) => (
        <span className="text-xs text-gray-500">{formatDate(b.joinedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'פעולות',
      render: (b: Business) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewDetails(b)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="הצג פרטים"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleBlock(b)}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              b.isBlocked
                ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
                : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
            )}
            title={b.isBlocked ? 'בטל חסימה' : 'חסום'}
          >
            {b.isBlocked ? <CheckCircleIcon className="w-4 h-4" /> : <NoSymbolIcon className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <Table
        columns={columns}
        data={businesses}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyMessage="לא נמצאו עסקים"
        onRowClick={onViewDetails}
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};
