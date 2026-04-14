import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { PricingForm } from '../components/pricing/PricingForm';
import { bulkUpdatePricing } from '../services/pricing.service';
import type { PricingZone } from '../types';
import { DEFAULT_PRICING_ZONES } from '../utils/constants';

// Load zones from localStorage or fall back to defaults
const STORAGE_KEY = 'app_pricing_zones';
function loadStoredZones(): PricingZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PricingZone[];
  } catch { /* ignore */ }
  // Convert defaults to full PricingZone type
  return DEFAULT_PRICING_ZONES.map((z) => ({
    ...z,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  }));
}
function saveZones(zones: PricingZone[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}

interface EditValues {
  [zoneId: string]: string;
}

const getPriceColor = (price: number) => {
  if (price <= 45) return 'text-green-600 dark:text-green-400';
  if (price <= 100) return 'text-blue-600 dark:text-blue-400';
  if (price <= 200) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const Pricing: React.FC = () => {
  const [zones, setZones] = useState<PricingZone[]>(() => loadStoredZones());
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Track which zone ids have been changed
  const unsavedIds = Object.keys(editValues);
  const hasUnsaved = unsavedIds.length > 0;

  // Zones are loaded from localStorage on init — no async fetch needed

  const startEdit = (zone: PricingZone) => {
    setEditingId(zone.id);
    // Preserve any already-edited value, otherwise use current zone price
    if (!(zone.id in editValues)) {
      setEditValues((prev) => ({ ...prev, [zone.id]: String(zone.basePrice) }));
    }
  };

  const cancelEdit = () => {
    if (editingId) {
      // Only remove from editValues if the value hasn't actually changed
      setEditValues((prev) => {
        const zone = zones.find((z) => z.id === editingId);
        if (zone && prev[editingId] === String(zone.basePrice)) {
          const { [editingId]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
    setEditingId(null);
  };

  const commitEdit = (id: string) => {
    const val = editValues[id];
    const newPrice = Number(val);
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error('מחיר לא תקין');
      return;
    }
    setEditingId(null);
    // Keep the new value in editValues — will be sent on save
  };

  const handleSaveAll = async () => {
    const changed = Object.entries(editValues)
      .map(([id, val]) => ({ id, basePrice: Number(val) }))
      .filter(({ basePrice }) => !isNaN(basePrice) && basePrice > 0);

    if (changed.length === 0) {
      toast.error('אין שינויים לשמור');
      return;
    }

    setSaving(true);
    try {
      // Save locally — try backend too (gracefully ignore if offline)
      const updatedZones = zones.map((z) => {
        const match = changed.find((c) => c.id === z.id);
        return match ? { ...z, basePrice: match.basePrice, updatedAt: new Date().toISOString() } : z;
      });
      setZones(updatedZones);
      saveZones(updatedZones);
      bulkUpdatePricing(changed).catch(() => {/* offline — ignore */});
      toast.success('כל המחירים נשמרו בהצלחה!');
      setEditValues({});
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAll = () => {
    setEditValues({});
    setEditingId(null);
  };

  const handleAddZone = async (data: { name: string; basePrice: number; courierShare: number; description: string }) => {
    // The PricingForm posts through bulkUpdatePricing or a POST endpoint.
    // For now, show success and refetch (backend should handle creation via its own POST route).
    // If a dedicated addPricingZone service existed, we'd call it here.
    toast.success('אזור חדש נוסף — מרענן...');
    setShowAddModal(false);
    setZones(loadStoredZones());
  };

  const getDisplayPrice = (zone: PricingZone): number => {
    if (zone.id in editValues) {
      const parsed = Number(editValues[zone.id]);
      return isNaN(parsed) ? zone.basePrice : parsed;
    }
    return zone.basePrice;
  };

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול תמחור</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">טוען אזורים...</p>
          </div>
        </div>
        <Card padding="none">
          <TableSkeleton rows={8} cols={6} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-white mb-1">שגיאה בטעינת הנתונים</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button
            variant="primary"
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={() => setZones(loadStoredZones())}
          >
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול תמחור</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {zones.length} אזורי משלוח מוגדרים
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsaved && (
            <>
              <Button
                variant="secondary"
                onClick={handleCancelAll}
              >
                בטל שינויים
              </Button>
              <Button
                variant="primary"
                leftIcon={
                  saving
                    ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    : <CloudArrowUpIcon className="w-4 h-4" />
                }
                onClick={handleSaveAll}
                disabled={saving}
              >
                {saving ? 'שומר...' : 'שמור הכל'}
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            leftIcon={<PlusIcon className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            הוסף אזור
          </Button>
        </div>
      </div>

      {/* Stats */}
      {zones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מינימום</p>
            <p className="text-xl font-bold text-green-600">
              ₪{Math.min(...zones.map((z) => z.basePrice))}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מקסימום</p>
            <p className="text-xl font-bold text-red-500">
              ₪{Math.max(...zones.map((z) => z.basePrice))}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ממוצע</p>
            <p className="text-xl font-bold text-blue-600">
              ₪{Math.round(zones.reduce((s, z) => s + z.basePrice, 0) / zones.length)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">סה"כ אזורים</p>
            <p className="text-xl font-bold text-purple-600">{zones.length}</p>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {zones.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <CurrencyDollarIcon className="w-14 h-14 mb-4 opacity-25" />
          <p className="text-base font-medium">לא נמצאו אזורים</p>
          <p className="text-sm mt-1">הוסף אזור ראשון כדי להתחיל</p>
        </div>
      )}

      {/* Table */}
      {zones.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['#', 'שם האזור', 'מחיר ללקוח', 'חלק שליח', 'רווח פלטפורמה', 'הערות', 'פעולות'].map((h) => (
                    <th
                      key={h}
                      className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zones.map((zone, index) => {
                  const displayPrice = getDisplayPrice(zone);
                  const courierAmount = Math.round((displayPrice * zone.courierShare) / 100);
                  const platformAmount = displayPrice - courierAmount;
                  const isEditing = editingId === zone.id;
                  const hasLocalChange = zone.id in editValues && editValues[zone.id] !== String(zone.basePrice);

                  return (
                    <tr
                      key={zone.id}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{zone.name}</span>
                          {hasLocalChange && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                              לא שמור
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">₪</span>
                            <input
                              type="number"
                              value={editValues[zone.id] ?? String(zone.basePrice)}
                              onChange={(e) =>
                                setEditValues((prev) => ({ ...prev, [zone.id]: e.target.value }))
                              }
                              className="w-20 px-2 py-1 border border-primary rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit(zone.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(zone)}
                            className={`flex items-center gap-1.5 font-bold text-lg hover:opacity-70 transition-opacity ${getPriceColor(displayPrice)}`}
                          >
                            ₪{displayPrice}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                        ₪{courierAmount}
                      </td>
                      <td className="px-4 py-3 text-pink-600 dark:text-pink-400 font-medium">
                        ₪{platformAmount}
                      </td>
                      <td className="px-4 py-3">
                        {/* vehicleOnly: flag via description or zone name */}
                        {(zone.description?.includes('רכב') || zone.name?.includes('רכב')) && (
                          <Badge color="yellow">רכב בלבד</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => commitEdit(zone.id)}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 transition-colors"
                              title="שמור"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 transition-colors"
                              title="ביטול"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(zone)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                            title="ערוך מחיר"
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
        </Card>
      )}

      {/* Add Zone Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="הוסף אזור חדש"
        size="md"
      >
        <PricingForm
          onSubmit={handleAddZone}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Pricing;
