import React from 'react';
import { Table, Pagination } from '../ui/Table';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import type { Delivery } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { TruckIcon } from '@heroicons/react/24/outline';

interface DeliveryListProps {
  deliveries: Delivery[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowClick: (delivery: Delivery) => void;
}

export const DeliveryList: React.FC<DeliveryListProps> = ({
  deliveries,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onRowClick,
}) => {
  const columns = [
    {
      key: 'trackingNumber',
      header: 'מספר עקיבה',
      render: (d: Delivery) => (
        <span className="font-mono text-xs font-semibold text-primary">{d.trackingNumber}</span>
      ),
    },
    {
      key: 'status',
      header: 'סטטוס',
      render: (d: Delivery) => <DeliveryStatusBadge status={d.status} />,
    },
    {
      key: 'business',
      header: 'עסק',
      render: (d: Delivery) => (
        <span className="text-sm">{d.business.name}</span>
      ),
    },
    {
      key: 'customer',
      header: 'לקוח',
      render: (d: Delivery) => (
        <div>
          <p className="text-sm">{d.customer.name}</p>
          <p className="text-xs text-gray-400">{d.customer.phone}</p>
        </div>
      ),
    },
    {
      key: 'zone',
      header: 'אזור',
      render: (d: Delivery) => (
        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{d.zone}</span>
      ),
    },
    {
      key: 'courier',
      header: 'שליח',
      render: (d: Delivery) =>
        d.courier ? (
          <span className="text-sm">{d.courier.name}</span>
        ) : (
          <span className="text-xs text-gray-400">לא שובץ</span>
        ),
    },
    {
      key: 'price',
      header: 'מחיר',
      render: (d: Delivery) => (
        <span className="font-semibold text-sm text-primary">{formatCurrency(d.price)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'תאריך',
      render: (d: Delivery) => (
        <span className="text-xs text-gray-500">{formatDateTime(d.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-cardDark rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table
          columns={columns}
          data={deliveries}
          keyExtractor={(d) => d.id}
          isLoading={isLoading}
          emptyMessage="לא נמצאו משלוחים"
          onRowClick={onRowClick}
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-48" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <TruckIcon className="w-10 h-10 mb-3 opacity-25" />
            <p className="text-sm">לא נמצאו משלוחים</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deliveries.map((d) => (
              <button
                key={d.id}
                onClick={() => onRowClick(d)}
                className="w-full text-right p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-semibold text-primary truncate block">
                      {d.trackingNumber}
                    </span>
                    <p className="text-[13px] font-semibold text-gray-900 mt-0.5 truncate">{d.business.name}</p>
                  </div>
                  <DeliveryStatusBadge status={d.status} />
                </div>
                <div className="flex items-center justify-between text-[12px] text-gray-500 gap-3">
                  <span className="truncate">{d.customer.name} • {d.customer.phone}</span>
                  <span className="font-semibold text-primary flex-shrink-0">{formatCurrency(d.price)}</span>
                </div>
                {(d.courier || d.zone) && (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                    {d.zone && <span className="bg-gray-100 px-2 py-0.5 rounded-full">{d.zone}</span>}
                    {d.courier && <span>שליח: {d.courier.name}</span>}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1.5">{formatDateTime(d.createdAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};
