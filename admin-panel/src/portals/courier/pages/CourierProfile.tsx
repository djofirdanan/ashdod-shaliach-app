import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { logoutUser } from '../../../store/authSlice';
import { getCourier, type StoredCourier } from '../../../services/storage.service';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const vehicleLabel: Record<StoredCourier['vehicle'], string> = {
  motorcycle: 'אופנוע',
  bicycle: 'אופניים',
  car: 'רכב',
  scooter: 'קטנוע',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#f59e0b' : '#e8ecf0', fontSize: 20 }}>
          ★
        </span>
      ))}
    </div>
  );
}

const CourierProfile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [courier, setCourier] = useState<StoredCourier | null>(null);

  useEffect(() => {
    if (!courierId) return;
    const c = getCourier(courierId);
    setCourier(c ?? null);
  }, [courierId]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid #f0f4f8' }}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: '#f0f4f8' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>{label}</p>
        <p className="text-[14px] font-bold truncate" style={{ color: '#061b31' }}>{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      {/* Avatar card */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #061b31, #1c1e54)', boxShadow: '0 8px 24px rgba(6,27,49,0.25)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
        >
          <UserCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-white text-[20px] font-black">{courier?.name ?? 'שליח'}</h1>
        <p className="text-white/60 text-[13px] mt-1">
          {courier ? vehicleLabel[courier.vehicle] : ''}
          {courier?.vehiclePlate ? ` · ${courier.vehiclePlate}` : ''}
        </p>
        <div className="mt-3">
          <StarRating rating={courier?.rating ?? 5} />
          <p className="text-white/50 text-[12px] mt-1">{courier?.rating?.toFixed(1) ?? '5.0'} / 5</p>
        </div>
      </div>

      {/* Details card */}
      <div
        className="rounded-2xl px-4"
        style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
      >
        <InfoRow
          icon={<EnvelopeIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="אימייל"
          value={courier?.email ?? ''}
        />
        <InfoRow
          icon={<PhoneIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="טלפון"
          value={courier?.phone ?? ''}
        />
        <InfoRow
          icon={<TruckIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="רכב"
          value={courier ? vehicleLabel[courier.vehicle] : ''}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0' }}
        >
          <p className="text-[22px] font-black" style={{ color: '#533afd' }}>
            {courier?.totalDeliveries ?? 0}
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>משלוחים הושלמו</p>
        </div>
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: '#fff', border: '1px solid #e8ecf0' }}
        >
          <p className="text-[22px] font-black" style={{ color: '#10b981' }}>
            ₪{courier?.earnings.total ?? 0}
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>סה"כ הכנסות</p>
        </div>
      </div>

      {/* Note */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
      >
        <p className="text-[12px] font-semibold" style={{ color: '#9a3412' }}>
          לא ניתן לשנות פרטים כאן — צור קשר עם המנהל
        </p>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl font-black text-[15px] transition-all active:scale-95"
        style={{ background: '#fff', border: '1px solid #fecdd3', color: '#ef4444' }}
      >
        התנתקות
      </button>
    </div>
  );
};

export default CourierProfile;
