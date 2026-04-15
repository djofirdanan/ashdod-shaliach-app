import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { logoutUser } from '../../../store/authSlice';
import {
  getCourier,
  updateCourier,
  getDeliveriesByCourier,
  getBusiness,
  getReviewsByTarget,
  addReview,
  verifyPassword,
  hashPassword,
  type StoredCourier,
  type StoredBusiness,
  type StoredReview,
} from '../../../services/storage.service';
import {
  UserCircleIcon,
  CameraIcon,
  PencilIcon,
  KeyIcon,
  TruckIcon,
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const vehicleOptions: { value: StoredCourier['vehicle']; label: string }[] = [
  { value: 'motorcycle', label: 'אופנוע' },
  { value: 'bicycle', label: 'אופניים' },
  { value: 'car', label: 'רכב' },
  { value: 'scooter', label: 'קטנוע' },
];
const vehicleLabel: Record<StoredCourier['vehicle'], string> = Object.fromEntries(
  vehicleOptions.map(o => [o.value, o.label])
) as Record<StoredCourier['vehicle'], string>;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#f59e0b' : '#e8ecf0', fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} onClick={() => onChange(i)} className="text-2xl leading-none">
        <span style={{ color: i <= value ? '#f59e0b' : '#e8ecf0' }}>★</span>
      </button>
    ))}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
    <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f4f8' }}>
      <h2 className="text-[13px] font-black" style={{ color: '#061b31' }}>{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const PastBusinessCard: React.FC<{
  business: StoredBusiness;
  deliveryId: string;
  courierId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  existingReview?: StoredReview;
  onReviewSaved: () => void;
}> = ({ business, deliveryId, courierId, isFavorite, onToggleFavorite, existingReview, onReviewSaved }) => {
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? '');

  const handleSave = () => {
    addReview({
      reviewerId: courierId,
      reviewerType: 'courier',
      targetId: business.id,
      targetType: 'business',
      rating,
      comment: comment.trim() || undefined,
      deliveryId,
    });
    setShowReview(false);
    toast.success('הביקורת נשמרה!');
    onReviewSaved();
  };

  return (
    <div className="rounded-xl p-3" style={{ background: '#f6f9fc', border: '1px solid #e8ecf0' }}>
      <div className="flex items-center gap-3 mb-2">
        {business.logo ? (
          <img src={business.logo} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[14px] font-black"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            {business.businessName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: '#061b31' }}>{business.businessName}</p>
          <div className="flex items-center gap-1">
            <StarRating rating={business.rating} />
            <span className="text-[11px]" style={{ color: '#8898aa' }}>{business.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: isFavorite ? '#ea2261' : '#8898aa' }}
          >
            {isFavorite ? <HeartSolid className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowReview(!showReview)}
            className="px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: showReview ? '#533afd' : '#f0f4f8', color: showReview ? '#fff' : '#533afd' }}
          >
            {existingReview ? 'ערוך' : 'דרג'}
          </button>
        </div>
      </div>

      {showReview && (
        <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
          <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>דירוג העסק</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
            style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
            placeholder="הערה (אופציונלי)..."
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              שמור
            </button>
            <button
              onClick={() => setShowReview(false)}
              className="px-3 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: '#f0f4f8', color: '#8898aa' }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ──────────────────────────── */
const CourierProfile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('admin_token') ?? '';
  const courierId = token.startsWith('courier-') ? token.replace('courier-', '') : '';

  const [courier, setCourier] = useState<StoredCourier | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'businesses'>('info');
  const [showAvailConfirm, setShowAvailConfirm] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVehicle, setEditVehicle] = useState<StoredCourier['vehicle']>('motorcycle');
  const [editPlate, setEditPlate] = useState('');

  // Password change
  const [pwMode, setPwMode] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  // Past businesses
  const [pastBusinesses, setPastBusinesses] = useState<{ business: StoredBusiness; deliveryId: string }[]>([]);
  const [reviews, setReviews] = useState<StoredReview[]>([]);

  const loadData = () => {
    if (!courierId) return;
    const c = getCourier(courierId);
    setCourier(c ?? null);
    if (c) {
      setEditName(c.name);
      setEditPhone(c.phone);
      setEditVehicle(c.vehicle);
      setEditPlate(c.vehiclePlate ?? '');
    }

    const deliveries = getDeliveriesByCourier(courierId).filter(d => d.status === 'delivered');
    const seen = new Set<string>();
    const list: { business: StoredBusiness; deliveryId: string }[] = [];
    for (const d of deliveries) {
      if (!seen.has(d.businessId)) {
        seen.add(d.businessId);
        const b = getBusiness(d.businessId);
        if (b) list.push({ business: b, deliveryId: d.id });
      }
    }
    setPastBusinesses(list);
    setReviews(getReviewsByTarget(courierId).filter(r => r.reviewerType === 'courier'));
  };

  useEffect(() => { loadData(); }, [courierId]);

  /* Photo upload */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courierId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = updateCourier(courierId, { photo: base64 });
      setCourier(updated);
      toast.success('התמונה עודכנה!');
    };
    reader.readAsDataURL(file);
  };

  /* Edit save */
  const handleSaveDetails = () => {
    if (!courierId) return;
    const updated = updateCourier(courierId, {
      name: editName.trim(),
      phone: editPhone.trim(),
      vehicle: editVehicle,
      vehiclePlate: editPlate.trim() || undefined,
    });
    setCourier(updated);
    setEditMode(false);
    toast.success('הפרטים עודכנו!');
  };

  /* Password change */
  const handlePasswordChange = () => {
    setPwError('');
    if (!courier) return;
    if (!verifyPassword(oldPw, courier.password)) {
      setPwError('הסיסמה הנוכחית שגויה');
      return;
    }
    if (newPw.length < 6) {
      setPwError('הסיסמה החדשה חייבת להיות לפחות 6 תווים');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('הסיסמאות אינן תואמות');
      return;
    }
    const updated = updateCourier(courierId, { password: hashPassword(newPw) });
    setCourier(updated);
    setPwMode(false);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    toast.success('הסיסמה שונתה!');
  };

  /* Toggle availability — shows confirmation first */
  const toggleAvailability = () => setShowAvailConfirm(true);

  const confirmToggleAvailability = () => {
    if (!courierId || !courier) return;
    const next = !(courier.isAvailable ?? true);
    const updated = updateCourier(courierId, { isAvailable: next });
    setCourier(updated);
    setShowAvailConfirm(false);
    toast.success(next ? '🟢 אתה זמין לקבל משלוחים' : '🔴 סימנת את עצמך כלא זמין');
  };

  /* Toggle favorite business */
  const toggleFavorite = (businessId: string) => {
    if (!courier || !courierId) return;
    const favs = courier.favoriteBusinesses ?? [];
    const next = favs.includes(businessId) ? favs.filter(id => id !== businessId) : [...favs, businessId];
    const updated = updateCourier(courierId, { favoriteBusinesses: next });
    setCourier(updated);
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const isAvailable = courier?.isAvailable ?? true;

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      {/* Photo / Avatar card */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #061b31, #1c1e54)', boxShadow: '0 8px 24px rgba(6,27,49,0.25)' }}
      >
        <div className="relative mb-3">
          {courier?.photo ? (
            <img
              src={courier.photo}
              alt="פרופיל"
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: '3px solid rgba(255,255,255,0.2)' }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
            >
              <UserCircleIcon className="w-10 h-10 text-white" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#fff' }}
          >
            <CameraIcon className="w-4 h-4" style={{ color: '#533afd' }} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <h1 className="text-white text-[20px] font-black">{courier?.name ?? 'שליח'}</h1>
        <p className="text-white/60 text-[13px] mt-1">
          {courier ? vehicleLabel[courier.vehicle] : ''}
          {courier?.vehiclePlate ? ` · ${courier.vehiclePlate}` : ''}
        </p>
        <div className="flex gap-0.5 mt-2">
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ color: i <= Math.round(courier?.rating ?? 5) ? '#f59e0b' : 'rgba(255,255,255,0.2)', fontSize: 18 }}>★</span>
          ))}
        </div>

        {/* Availability toggle */}
        <button
          onClick={toggleAvailability}
          className="mt-4 px-5 py-2 rounded-full font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95"
          style={{
            background: isAvailable ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${isAvailable ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: isAvailable ? '#34d399' : '#f87171',
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: isAvailable ? '#10b981' : '#ef4444' }}
          />
          {isAvailable ? 'זמין לקבל משלוחים' : 'לא זמין כרגע'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
          <p className="text-[22px] font-black" style={{ color: '#533afd' }}>{courier?.totalDeliveries ?? 0}</p>
          <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>משלוחים הושלמו</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: '#fff', border: '1px solid #e8ecf0' }}>
          <p className="text-[22px] font-black" style={{ color: '#10b981' }}>₪{courier?.earnings.total ?? 0}</p>
          <p className="text-[11px] mt-1" style={{ color: '#8898aa' }}>סה"כ הכנסות</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#f0f4f8' }}>
        {(['info', 'businesses'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
            style={{
              background: activeTab === t ? '#fff' : 'transparent',
              color: activeTab === t ? '#533afd' : '#8898aa',
              boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t === 'info' ? 'פרטים' : `עסקים (${pastBusinesses.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <>
          {/* Edit details */}
          <Section title="פרטים אישיים">
            {!editMode ? (
              <>
                {[
                  { label: 'שם מלא', value: courier?.name },
                  { label: 'אימייל', value: courier?.email },
                  { label: 'טלפון', value: courier?.phone },
                  { label: 'רכב', value: courier ? vehicleLabel[courier.vehicle] : '' },
                  { label: 'מספר רכב', value: courier?.vehiclePlate },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <span className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>{label}</span>
                    <span className="text-[13px] font-bold" style={{ color: '#061b31' }}>{value || '—'}</span>
                  </div>
                ))}
                <button
                  onClick={() => setEditMode(true)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                  style={{ background: '#f0f4f8', color: '#533afd' }}
                >
                  <PencilIcon className="w-4 h-4" />
                  ערוך פרטים
                </button>
              </>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'שם מלא', value: editName, setter: setEditName },
                  { label: 'טלפון', value: editPhone, setter: setEditPhone },
                  { label: 'מספר רכב', value: editPlate, setter: setEditPlate },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="text-[11px] font-semibold block mb-1" style={{ color: '#8898aa' }}>{label}</label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                      style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: '#8898aa' }}>סוג רכב</label>
                  <div className="grid grid-cols-2 gap-2">
                    {vehicleOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setEditVehicle(opt.value)}
                        className="py-2 rounded-xl text-[12px] font-bold transition-all"
                        style={{
                          background: editVehicle === opt.value ? '#533afd' : '#f0f4f8',
                          color: editVehicle === opt.value ? '#fff' : '#8898aa',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveDetails}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
                  >
                    <CheckIcon className="w-4 h-4" />
                    שמור
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-[13px]"
                    style={{ background: '#f0f4f8', color: '#8898aa' }}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Password change */}
          <Section title="שינוי סיסמה">
            {!pwMode ? (
              <button
                onClick={() => setPwMode(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                style={{ background: '#f0f4f8', color: '#533afd' }}
              >
                <KeyIcon className="w-4 h-4" />
                שנה סיסמה
              </button>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'סיסמה נוכחית', value: oldPw, setter: setOldPw },
                  { label: 'סיסמה חדשה', value: newPw, setter: setNewPw },
                  { label: 'אשר סיסמה חדשה', value: confirmPw, setter: setConfirmPw },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="text-[11px] font-semibold block mb-1" style={{ color: '#8898aa' }}>{label}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                      style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                    />
                  </div>
                ))}
                {pwError && (
                  <p className="text-[12px] font-semibold" style={{ color: '#ef4444' }}>{pwError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handlePasswordChange}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => { setPwMode(false); setPwError(''); setOldPw(''); setNewPw(''); setConfirmPw(''); }}
                    className="px-4 py-2.5 rounded-xl font-bold text-[13px]"
                    style={{ background: '#f0f4f8', color: '#8898aa' }}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </Section>
        </>
      )}

      {activeTab === 'businesses' && (
        <div className="space-y-3">
          {pastBusinesses.length === 0 ? (
            <div
              className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
              style={{ background: '#fff', border: '1px solid #e8ecf0' }}
            >
              <BuildingStorefrontIcon className="w-10 h-10" style={{ color: '#e8ecf0' }} />
              <p className="font-bold text-[14px]" style={{ color: '#8898aa' }}>עדיין לא עבדת עם עסקים</p>
              <p className="text-[12px]" style={{ color: '#8898aa' }}>לאחר שתמסור משלוח, העסק יופיע כאן</p>
            </div>
          ) : (
            pastBusinesses.map(({ business, deliveryId }) => (
              <PastBusinessCard
                key={business.id}
                business={business}
                deliveryId={deliveryId}
                courierId={courierId}
                isFavorite={(courier?.favoriteBusinesses ?? []).includes(business.id)}
                onToggleFavorite={() => toggleFavorite(business.id)}
                existingReview={reviews.find(r => r.targetId === business.id && r.deliveryId === deliveryId)}
                onReviewSaved={loadData}
              />
            ))
          )}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl font-black text-[15px] transition-all active:scale-95"
        style={{ background: '#fff', border: '1px solid #fecdd3', color: '#ef4444' }}
      >
        התנתקות
      </button>

      {/* Availability confirmation */}
      {showAvailConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAvailConfirm(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}
            dir="rtl"
          >
            <div className="text-[36px] mb-3">{isAvailable ? '🔴' : '🟢'}</div>
            <h3 className="text-[17px] font-black mb-2" style={{ color: '#061b31' }}>
              {isAvailable ? 'לסמן כלא זמין?' : 'לסמן כזמין?'}
            </h3>
            <p className="text-[13px] mb-5" style={{ color: '#8898aa' }}>
              {isAvailable
                ? 'לא תקבל משלוחים חדשים כל עוד אתה מסומן כלא זמין'
                : 'תתחיל לקבל התראות על משלוחים חדשים'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowAvailConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-[14px]" style={{ background: '#f0f4f8', color: '#8898aa' }}>ביטול</button>
              <button onClick={confirmToggleAvailability} className="flex-1 py-3 rounded-xl font-bold text-[14px] text-white" style={{ background: isAvailable ? '#ef4444' : '#10b981' }}>
                {isAvailable ? 'אשר — לא זמין' : 'אשר — זמין'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierProfile;
