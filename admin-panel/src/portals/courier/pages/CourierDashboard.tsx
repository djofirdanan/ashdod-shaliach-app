import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import {
  getCourier,
  getDeliveriesByCourier,
  getPendingNotifications,
  type StoredDelivery,
} from '../../../services/storage.service';
import { TruckIcon, BellIcon } from '@heroicons/react/24/outline';

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#f59e0b' : '#e8ecf0', fontSize: 16 }}>
          ★
        </span>
      ))}
    </div>
  );
}

const CourierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [earnings, setEarnings] = useState({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [rating, setRating] = useState(5);
  const [totalDone, setTotalDone] = useState(0);

  useEffect(() => {
    if (!courierId) return;
    const d = getDeliveriesByCourier(courierId);
    setDeliveries(d);
    const pending = getPendingNotifications(courierId);
    setPendingCount(pending.length);
    const courier = getCourier(courierId);
    if (courier) {
      setEarnings(courier.earnings);
      setRating(courier.rating);
      setTotalDone(courier.totalDeliveries);
    }
  }, [courierId]);

  const activeDelivery = deliveries.find((d) =>
    ['accepted', 'picked_up'].includes(d.status)
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      {/* Welcome card */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #061b31, #1c1e54)', boxShadow: '0 8px 24px rgba(6,27,49,0.30)' }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: -40, left: -40, width: 160, height: 160, background: 'rgba(83,58,253,0.15)' }}
        />
        <p className="text-white/60 text-[12px] font-semibold mb-1">שלום,</p>
        <h1 className="text-white text-[22px] font-black mb-2">{user?.name ?? 'שליח'}</h1>
        <div className="flex items-center gap-3">
          <StarRating rating={rating} />
          <span className="text-white/60 text-[12px]">{rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Available deliveries banner */}
      {pendingCount > 0 && (
        <button
          onClick={() => navigate('/courier/available')}
          className="w-full flex items-center gap-3 rounded-2xl p-4 text-right transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 4px 16px rgba(83,58,253,0.30)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <BellIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-black text-[14px]">
              {pendingCount} {pendingCount === 1 ? 'משלוח פנוי' : 'משלוחים פנויים'}
            </p>
            <p className="text-white/70 text-[12px]">לחץ לצפייה וקבלה</p>
          </div>
          <span className="text-white text-[20px]">←</span>
        </button>
      )}

      {/* Earnings cards */}
      <div>
        <h2 className="text-[15px] font-black mb-3" style={{ color: '#061b31' }}>הכנסות</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'היום', value: earnings.today },
            { label: 'השבוע', value: earnings.thisWeek },
            { label: 'החודש', value: earnings.thisMonth },
          ].map((e) => (
            <div
              key={e.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[18px] font-black" style={{ color: '#061b31' }}>₪{e.value}</p>
              <p className="text-[10px] mt-1" style={{ color: '#8898aa' }}>{e.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[24px] font-black" style={{ color: '#533afd' }}>{totalDone}</p>
          <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>משלוחים הושלמו</p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
        >
          <p className="text-[24px] font-black" style={{ color: '#f59e0b' }}>{rating.toFixed(1)}</p>
          <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>דירוג ממוצע</p>
        </div>
      </div>

      {/* Active delivery */}
      {activeDelivery && (
        <div>
          <h2 className="text-[15px] font-black mb-3" style={{ color: '#061b31' }}>משלוח פעיל</h2>
          <div
            className="rounded-2xl p-4"
            style={{ background: '#fff', border: `2px solid ${statusColor[activeDelivery.status]}30`, boxShadow: '0 2px 12px rgba(83,58,253,0.08)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: statusColor[activeDelivery.status] + '18', color: statusColor[activeDelivery.status] }}
              >
                {statusLabel[activeDelivery.status]}
              </span>
              <span className="text-[13px] font-bold" style={{ color: '#533afd' }}>₪{activeDelivery.price}</span>
            </div>
            <p className="text-[13px] font-semibold" style={{ color: '#061b31' }}>
              איסוף: {activeDelivery.pickupAddress}
            </p>
            <p className="text-[13px] mt-1" style={{ color: '#8898aa' }}>
              מסירה: {activeDelivery.dropAddress}
            </p>
            <button
              onClick={() => navigate('/courier/deliveries')}
              className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95"
              style={{ background: '#f6f9fc', color: '#533afd', border: '1px solid #e8ecf0' }}
            >
              נהל משלוח
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate('/courier/available')}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[15px] transition-all active:scale-95"
        style={{ background: '#f0f4f8', color: '#533afd', border: '1px solid #e8ecf0' }}
      >
        <TruckIcon className="w-5 h-5" />
        משלוחים פנויים {pendingCount > 0 && `(${pendingCount})`}
      </button>
    </div>
  );
};

export default CourierDashboard;
