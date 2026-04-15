import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import {
  getDeliveriesByBusiness,
  getBusiness,
  type StoredDelivery,
} from '../../../services/storage.service';
import { TruckIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

const statusLabel: Record<StoredDelivery['status'], string> = {
  pending: 'ממתין לשליח',
  accepted: 'שליח בדרך לאיסוף',
  picked_up: 'בדרך ללקוח',
  delivered: 'נמסר',
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
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    const d = getDeliveriesByBusiness(businessId);
    setDeliveries(d);
    const biz = getBusiness(businessId);
    setBalance(biz?.balance ?? 0);
  }, [businessId]);

  const activeCount = deliveries.filter((d) =>
    ['pending', 'accepted', 'picked_up'].includes(d.status)
  ).length;
  const recent = [...deliveries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Welcome card */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 8px 24px rgba(83,58,253,0.30)' }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: -40, left: -40, width: 160, height: 160, background: 'rgba(255,255,255,0.08)' }}
        />
        <p className="text-white/70 text-[12px] font-semibold mb-1">ברוך הבא</p>
        <h1 className="text-white text-[22px] font-black mb-4">{user?.name ?? 'עסק'}</h1>
        <button
          onClick={() => navigate('/business/new-delivery')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)' }}
        >
          <PlusCircleIcon className="w-5 h-5" />
          בקש משלוח חדש
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'סה"כ משלוחים', value: deliveries.length },
          { label: 'פעילים', value: activeCount, color: '#533afd' },
          { label: 'יתרה ₪', value: balance.toFixed(0), color: '#10b981' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-3 text-center"
            style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
          >
            <p className="text-[20px] font-black" style={{ color: s.color ?? '#061b31' }}>
              {s.value}
            </p>
            <p className="text-[10px] mt-1" style={{ color: '#8898aa' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent deliveries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-black" style={{ color: '#061b31' }}>משלוחים אחרונים</h2>
          {deliveries.length > 0 && (
            <button
              onClick={() => navigate('/business/deliveries')}
              className="text-[12px] font-semibold"
              style={{ color: '#533afd' }}
            >
              הכל
            </button>
          )}
        </div>

        {deliveries.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
            style={{ background: '#fff', border: '1px solid #e8ecf0' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #533afd22, #ea226122)' }}
            >
              <TruckIcon className="w-7 h-7" style={{ color: '#533afd' }} />
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color: '#061b31' }}>אין משלוחים עדיין</p>
              <p className="text-[12px] mt-1" style={{ color: '#8898aa' }}>הזמן את המשלוח הראשון שלך</p>
            </div>
            <button
              onClick={() => navigate('/business/new-delivery')}
              className="mt-1 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              בקש משלוח ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl p-4"
                style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                  >
                    {statusLabel[d.status]}
                  </span>
                  <span className="text-[11px]" style={{ color: '#8898aa' }}>
                    {formatDate(d.createdAt)}
                  </span>
                </div>
                <p className="text-[13px] font-semibold" style={{ color: '#061b31' }}>
                  {d.dropAddress}
                </p>
                {d.courierName && (
                  <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>
                    שליח: {d.courierName}
                  </p>
                )}
                <p className="text-[13px] font-bold mt-1.5" style={{ color: '#533afd' }}>
                  ₪{d.price}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;
