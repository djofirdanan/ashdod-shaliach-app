import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import type { RootState } from '../../../store';
import {
  getPendingNotifications,
  acceptNotification,
  updateDelivery,
  getDeliveries,
  getCourier,
  type DeliveryNotification,
} from '../../../services/storage.service';
import { BellIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const AvailableDeliveries: React.FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);
  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!courierId) return;
    setNotifications(getPendingNotifications(courierId));
  }, [courierId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleAccept = async (notif: DeliveryNotification) => {
    if (!courierId || !user) return;
    setAccepting(notif.id);
    try {
      // Mark notification as taken
      acceptNotification(notif.id, courierId);

      // Find the matching delivery and update it
      const allDeliveries = getDeliveries();
      const matching = allDeliveries.find(
        (d) =>
          d.businessId === notif.businessId &&
          d.pickupAddress === notif.pickupAddress &&
          d.status === 'pending'
      );

      const courierData = getCourier(courierId);
      const courierName = courierData?.name ?? user.name ?? 'שליח';

      if (matching) {
        updateDelivery(matching.id, {
          status: 'accepted',
          courierId,
          courierName,
          acceptedAt: new Date().toISOString(),
        });
      }

      toast.success('קיבלת את המשלוח! בדרך לאיסוף...');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בקבלת המשלוח');
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-black" style={{ color: '#061b31' }}>משלוחים פנויים</h1>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
          style={{ background: '#f0f4f8', color: '#533afd', border: '1px solid #e8ecf0' }}
        >
          <ArrowPathIcon className="w-4 h-4" />
          רענן
        </button>
      </div>

      {notifications.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#f0f4f8' }}
          >
            <BellIcon className="w-8 h-8" style={{ color: '#8898aa' }} />
          </div>
          <p className="font-bold text-[16px]" style={{ color: '#061b31' }}>אין משלוחים פנויים כרגע</p>
          <p className="text-[12px]" style={{ color: '#8898aa' }}>
            המערכת מחפשת משלוחים חדשים כל 5 שניות...
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl p-4"
              style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(83,58,253,0.06)' }}
            >
              {/* Business + price */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-black"
                    style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
                  >
                    {n.businessName[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: '#061b31' }}>{n.businessName}</p>
                    <p className="text-[10px]" style={{ color: '#8898aa' }}>
                      {new Date(n.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {n.price != null && (
                  <span
                    className="text-[16px] font-black"
                    style={{ color: '#533afd' }}
                  >
                    ₪{n.price}
                  </span>
                )}
              </div>

              {/* Addresses */}
              <div className="space-y-2 mb-4">
                <div className="flex gap-2 items-start">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                    style={{ background: '#533afd' }}
                  >
                    א
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>איסוף</p>
                    <p className="text-[13px] font-semibold" style={{ color: '#061b31' }}>{n.pickupAddress}</p>
                  </div>
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
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>מסירה</p>
                    <p className="text-[13px] font-semibold" style={{ color: '#061b31' }}>{n.dropAddress}</p>
                  </div>
                </div>
              </div>

              {n.description && (
                <div
                  className="rounded-xl px-3 py-2 mb-3 text-[12px]"
                  style={{ background: '#f6f9fc', color: '#8898aa' }}
                >
                  {n.description}
                </div>
              )}

              {/* Accept button */}
              <button
                onClick={() => handleAccept(n)}
                disabled={accepting === n.id}
                className="w-full py-3 rounded-xl text-white font-black text-[14px] transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 4px 12px rgba(83,58,253,0.25)' }}
              >
                {accepting === n.id ? 'מקבל...' : 'קבל משלוח'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvailableDeliveries;
