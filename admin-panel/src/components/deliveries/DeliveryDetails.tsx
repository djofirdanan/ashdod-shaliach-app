import React, { useState } from 'react';
import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import type { Delivery, DeliveryStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { DELIVERY_STATUS_LABELS } from '../../utils/constants';

interface DeliveryDetailsProps {
  delivery: Delivery | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, status: DeliveryStatus) => void;
  isUpdating?: boolean;
}

const statusOptions = Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-400">
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  delivery,
  isOpen,
  onClose,
  onStatusChange,
  isUpdating = false,
}) => {
  const [newStatus, setNewStatus] = useState<DeliveryStatus | ''>('');

  if (!delivery) return null;

  const handleStatusUpdate = () => {
    if (newStatus && onStatusChange) {
      onStatusChange(delivery.id, newStatus as DeliveryStatus);
      setNewStatus('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`פרטי משלוח — ${delivery.trackingNumber}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            סגור
          </Button>
          {onStatusChange && (
            <Button
              variant="primary"
              onClick={handleStatusUpdate}
              disabled={!newStatus || newStatus === delivery.status}
              isLoading={isUpdating}
            >
              עדכן סטטוס
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* Status section */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 mb-1">סטטוס נוכחי</p>
            <DeliveryStatusBadge status={delivery.status} />
          </div>
          {onStatusChange && (
            <div className="w-40">
              <Select
                options={statusOptions}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as DeliveryStatus)}
                placeholder="שנה סטטוס..."
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Business */}
          <InfoRow
            icon={<BuildingStorefrontIcon className="w-4 h-4" />}
            label="עסק"
            value={delivery.business.name}
          />
          {/* Customer */}
          <InfoRow
            icon={<UserIcon className="w-4 h-4" />}
            label="לקוח"
            value={`${delivery.customer.name} | ${delivery.customer.phone}`}
          />
          {/* Pickup */}
          <InfoRow
            icon={<MapPinIcon className="w-4 h-4" />}
            label="כתובת איסוף"
            value={`${delivery.pickupAddress.street}, ${delivery.pickupAddress.city}`}
          />
          {/* Delivery */}
          <InfoRow
            icon={<MapPinIcon className="w-4 h-4" />}
            label="כתובת מסירה"
            value={`${delivery.deliveryAddress.street}, ${delivery.deliveryAddress.city}`}
          />
          {/* Zone */}
          <InfoRow
            icon={<MapPinIcon className="w-4 h-4" />}
            label="אזור"
            value={delivery.zone}
          />
          {/* Price */}
          <InfoRow
            icon={<PhoneIcon className="w-4 h-4" />}
            label="מחיר"
            value={formatCurrency(delivery.price)}
          />
          {/* Created */}
          <InfoRow
            icon={<ClockIcon className="w-4 h-4" />}
            label="נוצר ב"
            value={formatDateTime(delivery.createdAt)}
          />
          {/* Delivered */}
          {delivery.deliveredAt && (
            <InfoRow
              icon={<ClockIcon className="w-4 h-4" />}
              label="נמסר ב"
              value={formatDateTime(delivery.deliveredAt)}
            />
          )}
        </div>

        {/* Courier */}
        {delivery.courier && (
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{delivery.courier.name}</p>
                <p className="text-xs text-gray-500">{delivery.courier.phone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {delivery.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">הערות</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              {delivery.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
