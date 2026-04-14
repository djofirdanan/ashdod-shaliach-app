import React from 'react';
import { MapPinIcon, PhoneIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import type { Delivery } from '../../types';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface DeliveryCardProps {
  delivery: Delivery;
  onClick?: () => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-cardDark rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {delivery.trackingNumber}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{delivery.business.name}</p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <MapPinIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <PhoneIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span>{delivery.customer.name} — {delivery.customer.phone}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>{formatDateTime(delivery.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
            <CurrencyDollarIcon className="w-3.5 h-3.5" />
            <span>{formatCurrency(delivery.price)}</span>
          </div>
        </div>
      </div>

      {delivery.courier && (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {delivery.courier.name.charAt(0)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            שליח: <strong>{delivery.courier.name}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
