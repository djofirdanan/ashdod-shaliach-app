import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  getDeliveriesByCourier,
  updateDelivery,
  type StoredDelivery,
} from '../../../services/storage.service';
import { TruckIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

type Tab = 'active' | 'completed' | 'archived';

const statusLabel: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending: 'ממתין לשליח',
  accepted: 'בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

const statusColor: Record<StoredDelivery['status'], string> = {
  scheduled: '#009DE0',
  pending: '#757575',
  accepted: '#009DE0',
  picked_up: '#F58F1F',
  delivered: '#1BA672',
  cancelled: '#E23437',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Swipeable archive card ────────────────────────────────────
const SwipeToArchive: React.FC<{
  onArchive: () => void;
  children: React.ReactNode;
}> = ({ onArchive, children }) => {
  const startX = useRef(0);
  const [swipeX, setSwipeX] = useState(0);
  const THRESHOLD = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0) setSwipeX(Math.min(dx, THRESHOLD + 30));
  };

  const handleTouchEnd = () => {
    if (swipeX >= THRESHOLD) {
      onArchive();
    }
    setSwipeX(0);
  };

  const progress = Math.min(swipeX / THRESHOLD, 1);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Archive reveal background */}
      {swipeX > 8 && (
        <div
          className="absolute inset-0 flex items-center px-4 rounded-2xl"
          style={{ background: `rgba(27,166,114,${Math.min(progress, 0.9)})` }}
        >
          <div className="flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5 text-white" />
            <span className="text-white text-[13px] font-black">ארכיון</span>
          </div>
        </div>
      )}
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.2s ease' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

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
    if (tab === 'active') return ['accepted', 'picked_up'].includes(d.status) && !d.archived;
    if (tab === 'completed') return ['delivered', 'cancelled'].includes(d.status) && !d.archived;
    if (tab === 'archived') return d.archived === true;
    return false;
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

  const handleArchive = (id: string) => {
    updateDelivery(id, { archived: true });
    toast.success('הועבר לארכיון');
    load();
  };

  const handleUnarchive = (id: string) => {
    updateDelivery(id, { archived: false });
    toast.success('הוחזר מהארכיון');
    load();
  };

  const archivedCount = deliveries.filter(d => d.archived).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-5" style={{ background: '#F4F4F4', minHeight: '100vh' }}>
      <h1 className="text-[20px] font-black mb-5" style={{ color: '#202125' }}>המשלוחים שלי</h1>

      {/* Tabs */}
      <div
        className="flex mb-4"
        style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E8E8', overflow: 'hidden' }}
      >
        {([
          { id: 'active' as Tab, label: 'פעילים', badge: null },
          { id: 'completed' as Tab, label: 'הושלמו', badge: null },
          { id: 'archived' as Tab, label: 'ארכיון', badge: archivedCount > 0 ? archivedCount : null },
        ]).map((t, i, arr) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-[13px] font-bold transition-all flex items-center justify-center gap-1.5"
            style={{
              background: tab === t.id ? '#009DE0' : '#FFFFFF',
              color: tab === t.id ? '#FFFFFF' : '#757575',
              borderRight: i < arr.length - 1 ? '1px solid #E8E8E8' : 'none',
            }}
          >
            {t.label}
            {t.badge !== null && (
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.id ? 'rgba(255,255,255,0.3)' : '#E23437',
                  color: '#FFFFFF',
                  minWidth: '18px',
                  textAlign: 'center',
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'completed' && (
        <p className="text-[11px] mb-3 text-center" style={{ color: '#757575' }}>
          החלק ימינה כדי להעביר לארכיון
        </p>
      )}

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: '#E6F6FC' }}
          >
            {tab === 'archived'
              ? <ArchiveBoxIcon className="w-7 h-7" style={{ color: '#009DE0' }} />
              : <TruckIcon className="w-7 h-7" style={{ color: '#009DE0' }} />
            }
          </div>
          <p className="text-[14px] font-bold" style={{ color: '#202125' }}>
            {tab === 'active' ? 'אין משלוחים פעילים' : tab === 'completed' ? 'אין היסטוריה עדיין' : 'הארכיון ריק'}
          </p>
          <p className="text-[12px]" style={{ color: '#757575' }}>
            {tab === 'active' ? 'משלוחים שקיבלת יופיעו כאן' : tab === 'completed' ? 'משלוחים שהושלמו יופיעו כאן' : 'משלוחים שהועברו לארכיון יופיעו כאן'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const cardContent = (
              <div
                className="rounded-2xl p-4"
                style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
              >
                {/* Status + price */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                  >
                    {statusLabel[d.status]}
                  </span>
                  <span className="text-[14px] font-black" style={{ color: '#009DE0' }}>₪{d.price}</span>
                </div>

                {/* Business name */}
                <p className="text-[12px] font-semibold mb-2" style={{ color: '#757575' }}>
                  {d.businessName}
                </p>

                {/* Addresses */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: '#009DE0' }}
                    >
                      א
                    </div>
                    <p className="text-[13px]" style={{ color: '#202125' }}>{d.pickupAddress}</p>
                  </div>
                  <div className="w-px h-3 mr-2.5" style={{ background: '#E8E8E8' }} />
                  <div className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                      style={{ background: '#202125' }}
                    >
                      ב
                    </div>
                    <p className="text-[13px]" style={{ color: '#202125' }}>{d.dropAddress}</p>
                  </div>
                </div>

                {/* Time */}
                <p className="text-[11px] mb-3" style={{ color: '#757575' }}>{formatDate(d.createdAt)}</p>

                {/* Action buttons */}
                {d.status === 'accepted' && (
                  <button
                    onClick={() => handleStatusUpdate(d, 'picked_up')}
                    disabled={updating === d.id}
                    className="w-full py-3 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: '#F58F1F', boxShadow: '0 3px 10px rgba(245,143,31,0.30)' }}
                  >
                    {updating === d.id ? '...' : 'אספתי את החבילה'}
                  </button>
                )}
                {d.status === 'picked_up' && (
                  <button
                    onClick={() => handleStatusUpdate(d, 'delivered')}
                    disabled={updating === d.id}
                    className="w-full py-3 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: '#1BA672', boxShadow: '0 3px 10px rgba(27,166,114,0.30)' }}
                  >
                    {updating === d.id ? '...' : 'מסרתי ללקוח ✓'}
                  </button>
                )}
                {tab === 'archived' && (
                  <button
                    onClick={() => handleUnarchive(d.id)}
                    className="w-full mt-2 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                    style={{
                      background: 'transparent',
                      color: '#009DE0',
                      border: '1.5px solid #009DE0',
                    }}
                  >
                    הוצא מהארכיון
                  </button>
                )}
              </div>
            );

            return tab === 'completed' ? (
              <SwipeToArchive key={d.id} onArchive={() => handleArchive(d.id)}>
                {cardContent}
              </SwipeToArchive>
            ) : (
              <div key={d.id}>{cardContent}</div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourierDeliveries;
