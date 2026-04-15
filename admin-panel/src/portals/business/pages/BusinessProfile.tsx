import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { logoutUser } from '../../../store/authSlice';
import { getBusiness, type StoredBusiness } from '../../../services/storage.service';
import {
  UserCircleIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const BusinessProfile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [biz, setBiz] = useState<StoredBusiness | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const b = getBusiness(businessId);
    setBiz(b ?? null);
  }, [businessId]);

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
        style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 8px 24px rgba(83,58,253,0.25)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <BuildingStorefrontIcon className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-white text-[20px] font-black">{biz?.businessName ?? 'עסק'}</h1>
        <p className="text-white/70 text-[13px] mt-1">{biz?.category ?? ''}</p>
      </div>

      {/* Details card */}
      <div
        className="rounded-2xl px-4"
        style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
      >
        <InfoRow
          icon={<UserCircleIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="איש קשר"
          value={biz?.contactPerson ?? ''}
        />
        <InfoRow
          icon={<EnvelopeIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="אימייל"
          value={biz?.email ?? ''}
        />
        <InfoRow
          icon={<PhoneIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="טלפון"
          value={biz?.phone ?? ''}
        />
        <InfoRow
          icon={<MapPinIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="כתובת"
          value={biz ? `${biz.address.street}, ${biz.address.city}` : ''}
        />
        <InfoRow
          icon={<TagIcon className="w-4 h-4" style={{ color: '#533afd' }} />}
          label="קטגוריה"
          value={biz?.category ?? ''}
        />
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

export default BusinessProfile;
