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
import { TruckIcon, BellIcon, ChevronLeftIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const BLUE = '#009DE0';

const STATUS_LABEL: Record<StoredDelivery['status'], string> = {
  scheduled: '📅 מתוזמן',
  pending:   'ממתין לאיסוף',
  accepted:  'בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר ✓',
  cancelled: 'בוטל',
};

const STATUS_COLOR: Record<StoredDelivery['status'], { bg: string; text: string }> = {
  scheduled: { bg: '#EEF2FF', text: '#6366F1' },
  pending:   { bg: '#F4F4F4', text: '#757575' },
  accepted:  { bg: '#EAF7FD', text: BLUE },
  picked_up: { bg: '#FFF8E6', text: '#F58F1F' },
  delivered: { bg: '#E8F8F0', text: '#1BA672' },
  cancelled: { bg: '#FFF0F0', text: '#E23437' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        i <= Math.round(rating)
          ? <StarSolid  key={i} className="w-4 h-4" style={{ color: '#F58F1F' }} />
          : <StarIcon   key={i} className="w-4 h-4" style={{ color: '#E8E8E8' }} />
      ))}
    </div>
  );
}

const CourierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user     = useSelector((s: RootState) => s.auth.user);

  const token     = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [deliveries,    setDeliveries]    = useState<StoredDelivery[]>([]);
  const [pendingCount,  setPendingCount]  = useState(0);
  const [earnings,      setEarnings]      = useState({ today: 0, thisWeek: 0, thisMonth: 0 });
  const [rating,        setRating]        = useState(5);
  const [totalDone,     setTotalDone]     = useState(0);
  const [courierName,   setCourierName]   = useState('');

  useEffect(() => {
    if (!courierId) return;
    const d       = getDeliveriesByCourier(courierId);
    const pending = getPendingNotifications(courierId);
    const courier = getCourier(courierId);
    setDeliveries(d);
    setPendingCount(pending.length);
    if (courier) {
      setEarnings(courier.earnings);
      setRating(courier.rating);
      setTotalDone(courier.totalDeliveries);
      setCourierName(courier.name);
    }
  }, [courierId]);

  const displayName   = courierName || user?.name || 'שליח';
  const activeDelivery = deliveries.find(d => ['accepted','picked_up'].includes(d.status));

  return (
    <div className="max-w-lg mx-auto" dir="rtl">

      {/* ── Hero greeting ── */}
      <div className="px-5 pt-6 pb-7" style={{ background: BLUE }}>
        <p className="text-white/80 text-[13px] font-medium mb-1">שלום,</p>
        <h1 className="text-white text-[24px] font-black mb-1">{displayName} 👋</h1>
        <div className="flex items-center gap-2">
          <StarRating rating={rating} />
          <span className="text-white/70 text-[12px] font-medium">{rating.toFixed(1)}</span>
        </div>
      </div>

      {/* ── Available deliveries banner ── */}
      {pendingCount > 0 && (
        <div className="px-4 -mt-3">
          <button
            onClick={() => navigate('/courier/available')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{ background: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', border: `1.5px solid ${BLUE}40` }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#EAF7FD' }}
            >
              <BellIcon className="w-5 h-5" style={{ color: BLUE }} />
            </div>
            <div className="flex-1 text-right">
              <p className="font-black text-[15px]" style={{ color: '#202125' }}>
                {pendingCount} {pendingCount === 1 ? 'משלוח פנוי' : 'משלוחים פנויים'}
              </p>
              <p className="text-[12px]" style={{ color: '#757575' }}>לחץ לצפייה וקבלה</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: BLUE }}
            >
              <ChevronLeftIcon className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      )}

      {/* ── Stats card ── */}
      <div className="px-4 mt-3">
        <div
          className="rounded-2xl p-4"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E8E8E8' }}
        >
          <p className="text-[13px] font-bold mb-3" style={{ color: '#757575' }}>סטטיסטיקות</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: '#F4F4F4' }}>
              <p className="text-[26px] font-black" style={{ color: BLUE }}>{totalDone}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#AAAAAA' }}>משלוחים הושלמו</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: '#F4F4F4' }}>
              <p className="text-[26px] font-black" style={{ color: '#F58F1F' }}>{rating.toFixed(1)}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#AAAAAA' }}>דירוג ממוצע</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Earnings ── */}
      <div className="px-4 mt-3">
        <p className="text-[17px] font-black mb-2" style={{ color: '#202125' }}>הכנסות</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'היום',   value: earnings.today     },
            { label: 'השבוע',  value: earnings.thisWeek  },
            { label: 'החודש',  value: earnings.thisMonth },
          ].map(e => (
            <div
              key={e.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[19px] font-black" style={{ color: '#202125' }}>₪{e.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#AAAAAA' }}>{e.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active delivery ── */}
      {activeDelivery && (
        <div className="px-4 mt-4">
          <p className="text-[17px] font-black mb-2" style={{ color: '#202125' }}>משלוח פעיל 🔥</p>
          <div
            className="rounded-2xl p-4"
            style={{ background: '#FFFFFF', border: `2px solid ${BLUE}30`, boxShadow: '0 2px 12px rgba(0,157,224,0.10)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[12px] font-bold px-3 py-1 rounded-full"
                style={{
                  background: STATUS_COLOR[activeDelivery.status].bg,
                  color:      STATUS_COLOR[activeDelivery.status].text,
                }}
              >
                {STATUS_LABEL[activeDelivery.status]}
              </span>
              <span className="text-[16px] font-black" style={{ color: BLUE }}>₪{activeDelivery.price}</span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5"
                  style={{ background: '#1BA672' }}
                >א</span>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: '#AAAAAA' }}>איסוף</p>
                  <p className="text-[13px] font-semibold" style={{ color: '#202125' }}>{activeDelivery.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 mt-0.5"
                  style={{ background: '#E23437' }}
                >ב</span>
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: '#AAAAAA' }}>מסירה</p>
                  <p className="text-[13px] font-semibold" style={{ color: '#202125' }}>{activeDelivery.dropAddress}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/courier/deliveries')}
              className="w-full py-3 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95"
              style={{ background: BLUE }}
            >
              נהל משלוח
            </button>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      {!activeDelivery && (
        <div className="px-4 mt-4 pb-6">
          <button
            onClick={() => navigate('/courier/available')}
            className="w-full py-4 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: BLUE, boxShadow: `0 6px 20px ${BLUE}40` }}
          >
            <TruckIcon className="w-5 h-5" />
            {pendingCount > 0 ? `ראה ${pendingCount} משלוחים פנויים` : 'חפש משלוחים פנויים'}
          </button>
        </div>
      )}
      {activeDelivery && <div className="pb-6" />}
    </div>
  );
};

export default CourierDashboard;
