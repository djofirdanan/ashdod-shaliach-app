import React, { useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Badge } from '../ui/Badge';
import type { PricingZone } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import clsx from 'clsx';

interface PricingTableProps {
  zones: PricingZone[];
  onUpdate: (zoneId: string, newPrice: number, newShare: number) => void;
  isLoading?: boolean;
}

interface EditState {
  zoneId: string;
  price: string;
  share: string;
}

export const PricingTable: React.FC<PricingTableProps> = ({ zones, onUpdate, isLoading = false }) => {
  const [editState, setEditState] = useState<EditState | null>(null);

  const startEdit = (zone: PricingZone) => {
    setEditState({
      zoneId: zone.id,
      price: zone.basePrice.toString(),
      share: zone.courierShare.toString(),
    });
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = (zone: PricingZone) => {
    const price = parseFloat(editState?.price || '0');
    const share = parseFloat(editState?.share || '70');
    if (isNaN(price) || price <= 0) return;
    if (isNaN(share) || share < 0 || share > 100) return;
    onUpdate(zone.id, price, share);
    setEditState(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50">
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">#</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">אזור</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">מחיר (₪)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">חלק שליח (%)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">חלק שליח (₪)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">סטטוס</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">עריכה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {zones.map((zone, index) => {
              const isEditing = editState?.zoneId === zone.id;
              const courierAmount = (zone.basePrice * zone.courierShare) / 100;

              return (
                <tr
                  key={zone.id}
                  className={clsx(
                    'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors',
                    isEditing && 'bg-[#6C63FF]/5 dark:bg-[#6C63FF]/10'
                  )}
                >
                  <td className="px-4 py-3 text-xs text-gray-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">{zone.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editState?.price}
                        onChange={(e) =>
                          setEditState((prev) => prev ? { ...prev, price: e.target.value } : null)
                        }
                        className="w-24 px-2 py-1 text-sm border border-[#6C63FF] rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
                        min="1"
                        step="1"
                      />
                    ) : (
                      <span className="font-semibold text-[#6C63FF]">{formatCurrency(zone.basePrice)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editState?.share}
                        onChange={(e) =>
                          setEditState((prev) => prev ? { ...prev, share: e.target.value } : null)
                        }
                        className="w-20 px-2 py-1 text-sm border border-[#6C63FF] rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#6C63FF]"
                        min="0"
                        max="100"
                        step="1"
                      />
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{zone.courierShare}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {formatCurrency(
                        isEditing
                          ? (parseFloat(editState?.price || '0') * parseFloat(editState?.share || '70')) / 100
                          : courierAmount
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={zone.isActive ? 'green' : 'gray'} dot size="sm">
                      {zone.isActive ? 'פעיל' : 'לא פעיל'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => saveEdit(zone)}
                          className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition-colors"
                          title="שמור"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors"
                          title="ביטול"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(zone)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-[#6C63FF] transition-colors"
                        title="ערוך"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
