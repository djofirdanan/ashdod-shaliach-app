import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getDeliveriesByCourier,
  updateDelivery,
  type StoredDelivery,
} from '../../../services/storage.service';
import { TruckIcon } from '@heroicons/react/24/outline';

type Tab = 'active' | 'completed';

const statusLabel: Record<StoredDelivery['status'], string> = {
  pending: 'ממתין לשליח',
  accepted: 'בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

const statusColor: Record<StoredDelivery['status'], string> = {
  pending: '#8898aa',
  accepted: '#533afd',
  picked_up: '#f59e0b',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const CourierDeliveries: React.FC = () => {
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = () => {
    if (!courierId) return;
    const d = getDeliveriesByCourier(courierId);
    setDeliveries(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  };

  useEffect(() => { load(); }, [courierId]);

  const filtered = deliveries.filter((d) => {
    if (tab === 'active') return ['accepted', 'picked_up'].includes(d.status);
    return ['delivered', 'cancelled'].includes(d.status);
  });

  const handleStatusUpdate = async (d: StoredDelivery, newStatus: 'picked_up' | 'delivered') => {
    setUpdating(d.id);
    try {
      const update: Partial<StoredDelivery> = { status: newStatus };
      if (newStatus === 'picked_up') update.pickedUpAt = new Date().toISOString();
      if (newStatus === 'delivered') update.deliveredAt = new Date().toISOString();
      updateDelivery(d.id, update);
      toast.success(newStatus === 'picked_up' ? 'אספת את החבילה!' : 'מסרת בהצלחה!');
      load();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בעדכון הסטטוס');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <h1 className="text-[20px] font-black mb-5" style={{ color: '#061b31' }}>המשלוחים שלי</h1>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-4"
        style={{ background: '#f0f4f8' }}
      >
        {([
          { id: 'active' as Tab, label: 'פעילים' },
          { id: 'completed' as Tab, label: 'הושלמו' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
            style={{
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#533afd' : '#8898aa',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0' }}
        >
          <TruckIcon className="w-10 h-10" style={{ color: '#e8ecf0' }} />
          <p className="text-[14px] font-bold" style={{ color: '#8898aa' }}>
            {tab === 'active' ? 'אין משלוחים פעילים' : 'אין היסטוריה עדיין'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl p-4"
              style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              {/* Status + price */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                >
                  {statusLabel[d.status]}
                </span>
                <span className="text-[14px] font-black" style={{ color: '#533afd' }}>₪{d.price}</span>
              </div>

              {/* Business name */}
              <p className="text-[12px] font-semibold mb-2" style={{ color: '#8898aa' }}>
                {d.businessName}
              </p>

              {/* Addresses */}
              <div className="space-y-1.5 mb-3">
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: '#533afd' }}
                  >
                    א
                  </div>
                  <p className="text-[13px]" style={{ color: '#061b31' }}>{d.pickupAddress}</p>
                </div>
                <div
                  className="w-px h-3 mr-2.5"
                  style={{ background: '#e8ecf0' }}
                />
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: '#ea2261' }}
                  >
                    ב
                  </div>
                  <p className="text-[13px]" style={{ color: '#061b31' }}>{d.dropAddress}</p>
                </div>
              </div>

              {/* Time */}
              <p className="text-[11px] mb-3" style={{ color: '#8898aa' }}>
                {formatDate(d.createdAt)}
              </p>

              {/* Action buttons for active deliveries */}
              {d.status === 'accepted' && (
                <button
                  onClick={() => handleStatusUpdate(d, 'picked_up')}
                  disabled={updating === d.id}
                  className="w-full py-3 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: '#f59e0b', boxShadow: '0 3px 10px rgba(245,158,11,0.30)' }}
                >
                  {updating === d.id ? '...' : 'אספתי את החבילה'}
                </button>
              )}
              {d.status === 'picked_up' && (
                <button
                  onClick={() => handleStatusUpdate(d, 'delivered')}
                  disabled={updating === d.id}
                  className="w-full py-3 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95 disabled:opacity-60"
                  style={{ background: '#10b981', boxShadow: '0 3px 10px rgba(16,185,129,0.30)' }}
                >
                  {updating === d.id ? '...' : 'מסרתי ללקוח ✓'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourierDeliveries;
