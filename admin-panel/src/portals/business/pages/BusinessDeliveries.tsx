import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDeliveriesByBusiness,
  getBusiness,
  addDeliveryNotification,
  type StoredDelivery,
} from '../../../services/storage.service';
import { TruckIcon, PlusCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type Tab = 'active' | 'completed' | 'all';

const statusLabel: Record<StoredDelivery['status'], string> = {
  pending: 'ממתין לשליח',
  accepted: 'שליח בדרך לאיסוף',
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
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const BusinessDeliveries: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [resending, setResending] = useState<string | null>(null);

  const loadDeliveries = () => {
    if (!businessId) return;
    const d = getDeliveriesByBusiness(businessId);
    setDeliveries(d.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  };

  useEffect(() => {
    loadDeliveries();
  }, [businessId]);

  const handleResend = async (d: StoredDelivery) => {
    if (!businessId) return;
    setResending(d.id);
    const biz = getBusiness(businessId);
    addDeliveryNotification({
      businessId,
      businessName: biz?.businessName ?? 'עסק',
      pickupAddress: d.pickupAddress,
      dropAddress: d.dropAddress,
      description: d.description,
      price: d.price,
    });
    toast.success('קריאה חדשה נשלחה לשליחים!');
    setResending(null);
  };

  const filtered = deliveries.filter((d) => {
    if (tab === 'active') return ['pending', 'accepted', 'picked_up'].includes(d.status);
    if (tab === 'completed') return ['delivered', 'cancelled'].includes(d.status);
    return true;
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'active', label: 'פעילים' },
    { id: 'completed', label: 'הושלמו' },
    { id: 'all', label: 'הכל' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-black" style={{ color: '#061b31' }}>המשלוחים שלי</h1>
        <button
          onClick={() => navigate('/business/new-delivery')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          <PlusCircleIcon className="w-4 h-4" />
          חדש
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-4"
        style={{ background: '#f0f4f8' }}
      >
        {tabs.map((t) => (
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

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0' }}
        >
          <TruckIcon className="w-10 h-10" style={{ color: '#e8ecf0' }} />
          <p className="text-[14px] font-bold" style={{ color: '#8898aa' }}>
            {tab === 'active' ? 'אין משלוחים פעילים' : tab === 'completed' ? 'אין משלוחים שהושלמו' : 'אין משלוחים עדיין'}
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
              {/* Status + time */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: statusColor[d.status] + '18', color: statusColor[d.status] }}
                >
                  {statusLabel[d.status]}
                </span>
                <span className="text-[11px]" style={{ color: '#8898aa' }}>
                  {formatDate(d.createdAt)}
                </span>
              </div>

              {/* Addresses */}
              <div className="space-y-1.5">
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

              {/* Footer row */}
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #f0f4f8' }}>
                <span className="text-[13px] font-bold" style={{ color: '#533afd' }}>₪{d.price}</span>
                <div className="flex items-center gap-2">
                  {d.courierName && (
                    <span className="text-[11px]" style={{ color: '#8898aa' }}>
                      שליח: {d.courierName}
                    </span>
                  )}
                  {d.customerName && !d.courierName && (
                    <span className="text-[11px]" style={{ color: '#8898aa' }}>
                      ל: {d.customerName}
                    </span>
                  )}
                  {d.status === 'pending' && (
                    <button
                      onClick={() => handleResend(d)}
                      disabled={resending === d.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: '#eef2ff', color: '#533afd' }}
                    >
                      <ArrowPathIcon className="w-3.5 h-3.5" />
                      שלח שוב
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessDeliveries;
