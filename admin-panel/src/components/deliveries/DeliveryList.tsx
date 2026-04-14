import React from 'react';
import { Table, Pagination } from '../ui/Table';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import type { Delivery } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

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
      <Table
        columns={columns}
        data={deliveries}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyMessage="לא נמצאו משלוחים"
        onRowClick={onRowClick}
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};
