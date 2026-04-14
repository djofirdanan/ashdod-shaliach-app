import React from 'react';
import { PhoneIcon, EnvelopeIcon, CalendarIcon, StarIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Courier, Business } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';
import clsx from 'clsx';

interface CourierCardProps {
  type: 'courier';
  user: Courier;
  onBlock?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

interface BusinessCardProps {
  type: 'business';
  user: Business;
  onBlock?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

type UserCardProps = CourierCardProps | BusinessCardProps;

const InfoRow: React.FC<{ icon: React.ReactNode; value: string }> = ({ icon, value }) => (
  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
    <span className="text-gray-400 flex-shrink-0">{icon}</span>
    <span className="truncate">{value}</span>
  </div>
);

export const UserCard: React.FC<UserCardProps> = ({ type, user, onBlock, onViewDetails }) => {
  const isCourier = type === 'courier';
  const courier = isCourier ? (user as Courier) : null;
  const business = !isCourier ? (user as Business) : null;

  const isBlocked = user.isBlocked;
  const name = user.name;
  const phone = user.phone;
  const email = user.email;
  const joinedAt = user.joinedAt;

  return (
    <div className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0',
              isCourier ? 'bg-[#6C63FF]' : 'bg-[#FF6584]'
            )}
          >
            {name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
            {isCourier && courier && (
              <div className="flex items-center gap-1 mt-0.5">
                <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-500">{courier.rating.toFixed(1)}</span>
              </div>
            )}
            {!isCourier && business && (
              <span className="text-xs text-gray-400">{business.category}</span>
            )}
          </div>
        </div>
        <Badge color={isBlocked ? 'red' : 'green'} dot>
          {isBlocked ? 'חסום' : 'פעיל'}
        </Badge>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <InfoRow icon={<PhoneIcon className="w-4 h-4" />} value={phone} />
        {email && <InfoRow icon={<EnvelopeIcon className="w-4 h-4" />} value={email} />}
        <InfoRow icon={<CalendarIcon className="w-4 h-4" />} value={`הצטרף: ${formatDate(joinedAt)}`} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {isCourier && courier ? (
          <>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{courier.totalDeliveries}</p>
              <p className="text-xs text-gray-500">משלוחים</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-[#6C63FF]">{formatCurrency(courier.earnings.total)}</p>
              <p className="text-xs text-gray-500">סה"כ הכנסות</p>
            </div>
          </>
        ) : business ? (
          <>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{business.totalDeliveries}</p>
              <p className="text-xs text-gray-500">משלוחים</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-[#FF6584]">{formatCurrency(business.balance)}</p>
              <p className="text-xs text-gray-500">יתרה</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => onViewDetails?.(user.id)}
        >
          פרטים
        </Button>
        <Button
          size="sm"
          variant={isBlocked ? 'success' : 'danger'}
          className="flex-1"
          onClick={() => onBlock?.(user.id)}
        >
          {isBlocked ? 'בטל חסימה' : 'חסום'}
        </Button>
      </div>
    </div>
  );
};
