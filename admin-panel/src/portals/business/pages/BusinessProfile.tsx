import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { logoutUser } from '../../../store/authSlice';
import {
  getBusiness,
  updateBusiness,
  getDeliveriesByBusiness,
  getCourier,
  getReviewsByTarget,
  addReview,
  verifyPassword,
  hashPassword,
  type StoredBusiness,
  type StoredCourier,
  type StoredReview,
} from '../../../services/storage.service';
import {
  BuildingStorefrontIcon,
  CameraIcon,
  PencilIcon,
  KeyIcon,
  HeartIcon,
  StarIcon,
  CheckIcon,
  XMarkIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

/* ─── Section wrapper ─────────────────────────── */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
    <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f4f8' }}>
      <h2 className="text-[13px] font-black" style={{ color: '#061b31' }}>{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* ─── Star picker ─────────────────────────────── */
const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} onClick={() => onChange(i)} className="text-2xl leading-none">
        <span style={{ color: i <= value ? '#f59e0b' : '#e8ecf0' }}>★</span>
      </button>
    ))}
  </div>
);

/* ─── Past couriers modal ──────────────────────── */
const PastCourierCard: React.FC<{
  courier: StoredCourier;
  deliveryId: string;
  businessId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  existingReview?: StoredReview;
  onReviewSaved: () => void;
}> = ({ courier, deliveryId, businessId, isFavorite, onToggleFavorite, existingReview, onReviewSaved }) => {
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    addReview({
      reviewerId: businessId,
      reviewerType: 'business',
      targetId: courier.id,
      targetType: 'courier',
      rating,
      comment: comment.trim() || undefined,
      deliveryId,
    });
    setSaving(false);
    setShowReview(false);
    toast.success('הביקורת נשמרה!');
    onReviewSaved();
  };

  return (
    <div className="rounded-xl p-3" style={{ background: '#f6f9fc', border: '1px solid #e8ecf0' }}>
      <div className="flex items-center gap-3 mb-2">
        {courier.photo ? (
          <img src={courier.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-black"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            {courier.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: '#061b31' }}>{courier.name}</p>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ color: i <= Math.round(courier.rating) ? '#f59e0b' : '#e8ecf0', fontSize: 12 }}>★</span>
            ))}
            <span className="text-[11px]" style={{ color: '#8898aa' }}>{courier.rating.toFixed(1)}</span>
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
          <p className="text-[11px] font-semibold" style={{ color: '#8898aa' }}>דירוג השליח</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
            style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
            placeholder="הערה (אופציונלי)..."
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 rounded-xl text-white text-[12px] font-bold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)' }}
          >
            {saving ? 'שומר...' : 'שמור ביקורת'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ──────────────────────────── */
const BusinessProfile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('admin_token') ?? '';
  const businessId = token.startsWith('business-') ? token.replace('business-', '') : '';

  const [biz, setBiz] = useState<StoredBusiness | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'couriers'>('info');

  // Edit details state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Password change state
  const [pwMode, setPwMode] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Past couriers state
  const [pastCouriers, setPastCouriers] = useState<{ courier: StoredCourier; deliveryId: string }[]>([]);
  const [reviews, setReviews] = useState<StoredReview[]>([]);

  const loadData = () => {
    if (!businessId) return;
    const b = getBusiness(businessId);
    setBiz(b ?? null);
    if (b) {
      setEditName(b.businessName);
      setEditContact(b.contactPerson);
      setEditPhone(b.phone);
      setEditStreet(b.address.street);
      setEditCity(b.address.city);
      setEditCategory(b.category);
    }

    // Load past couriers from deliveries
    const deliveries = getDeliveriesByBusiness(businessId).filter(d => d.courierId && d.status === 'delivered');
    const seen = new Set<string>();
    const list: { courier: StoredCourier; deliveryId: string }[] = [];
    for (const d of deliveries) {
      if (d.courierId && !seen.has(d.courierId)) {
        seen.add(d.courierId);
        const c = getCourier(d.courierId);
        if (c) list.push({ courier: c, deliveryId: d.id });
      }
    }
    setPastCouriers(list);
    setReviews(getReviewsByTarget(businessId).filter(r => r.reviewerType === 'business'));
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  /* Logo upload */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = updateBusiness(businessId, { logo: base64 });
      setBiz(updated);
      toast.success('הלוגו עודכן!');
    };
    reader.readAsDataURL(file);
  };

  /* Edit details save */
  const handleSaveDetails = () => {
    if (!businessId) return;
    const updated = updateBusiness(businessId, {
      businessName: editName.trim(),
      contactPerson: editContact.trim(),
      phone: editPhone.trim(),
      address: { street: editStreet.trim(), city: editCity.trim() },
      category: editCategory.trim(),
    });
    setBiz(updated);
    setEditMode(false);
    toast.success('הפרטים עודכנו!');
  };

  /* Password change */
  const handlePasswordChange = () => {
    setPwError('');
    if (!biz) return;
    if (!verifyPassword(oldPw, biz.password)) {
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
    setSavingPw(true);
    const updated = updateBusiness(businessId, { password: hashPassword(newPw) });
    setBiz(updated);
    setPwMode(false);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    setSavingPw(false);
    toast.success('הסיסמה שונתה בהצלחה!');
  };

  /* Toggle favorite courier */
  const toggleFavorite = (courierId: string) => {
    if (!biz || !businessId) return;
    const favs = biz.favoriteCouriers ?? [];
    const next = favs.includes(courierId) ? favs.filter(id => id !== courierId) : [...favs, courierId];
    const updated = updateBusiness(businessId, { favoriteCouriers: next });
    setBiz(updated);
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const categories = ['מסעדה', 'קפה', 'פרחים', 'תרופות', 'מכולת', 'אחר'];

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      {/* Logo / Avatar card */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center text-center relative"
        style={{ background: 'linear-gradient(135deg, #533afd, #ea2261)', boxShadow: '0 8px 24px rgba(83,58,253,0.25)' }}
      >
        <div className="relative mb-3">
          {biz?.logo ? (
            <img
              src={biz.logo}
              alt="לוגו"
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: '3px solid rgba(255,255,255,0.4)' }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <BuildingStorefrontIcon className="w-10 h-10 text-white" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: '#fff' }}
          >
            <CameraIcon className="w-4 h-4" style={{ color: '#533afd' }} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
        <h1 className="text-white text-[20px] font-black">{biz?.businessName ?? 'עסק'}</h1>
        <p className="text-white/70 text-[13px] mt-1">{biz?.category ?? ''}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: '#f0f4f8' }}>
        {(['info', 'couriers'] as const).map((t) => (
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
            {t === 'info' ? 'פרטים' : `שליחים (${pastCouriers.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <>
          {/* Details section */}
          <Section title="פרטי עסק">
            {!editMode ? (
              <>
                {[
                  { label: 'שם עסק', value: biz?.businessName },
                  { label: 'איש קשר', value: biz?.contactPerson },
                  { label: 'טלפון', value: biz?.phone },
                  { label: 'כתובת', value: biz ? `${biz.address.street}, ${biz.address.city}` : '' },
                  { label: 'קטגוריה', value: biz?.category },
                  { label: 'אימייל', value: biz?.email },
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
                  { label: 'שם עסק', value: editName, setter: setEditName },
                  { label: 'איש קשר', value: editContact, setter: setEditContact },
                  { label: 'טלפון', value: editPhone, setter: setEditPhone },
                  { label: 'רחוב', value: editStreet, setter: setEditStreet },
                  { label: 'עיר', value: editCity, setter: setEditCity },
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
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: '#8898aa' }}>קטגוריה</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
                    className="px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
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
                    disabled={savingPw}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-[13px] transition-all active:scale-95 disabled:opacity-60"
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

      {activeTab === 'couriers' && (
        <div className="space-y-3">
          {pastCouriers.length === 0 ? (
            <div
              className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
              style={{ background: '#fff', border: '1px solid #e8ecf0' }}
            >
              <TruckIcon className="w-10 h-10" style={{ color: '#e8ecf0' }} />
              <p className="font-bold text-[14px]" style={{ color: '#8898aa' }}>
                עדיין לא עבדת עם שליחים
              </p>
              <p className="text-[12px]" style={{ color: '#8898aa' }}>
                לאחר שמשלוח יימסר, השליח יופיע כאן
              </p>
            </div>
          ) : (
            pastCouriers.map(({ courier, deliveryId }) => (
              <PastCourierCard
                key={courier.id}
                courier={courier}
                deliveryId={deliveryId}
                businessId={businessId}
                isFavorite={(biz?.favoriteCouriers ?? []).includes(courier.id)}
                onToggleFavorite={() => toggleFavorite(courier.id)}
                existingReview={reviews.find(r => r.targetId === courier.id && r.deliveryId === deliveryId)}
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
    </div>
  );
};

export default BusinessProfile;
