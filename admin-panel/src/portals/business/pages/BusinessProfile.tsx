import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { logoutUser } from '../../../store/authSlice';
import { clearCacheAndResync } from '../../../services/sync.service';
import {
  getBusiness,
  updateBusiness,
  getDeliveriesByBusiness,
  getCourier,
  getReviewsByTarget,
  addReview,
  verifyPassword,
  hashPassword,
  cleanupOldConversations,
  cleanupCompletedDeliveryConvs,
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
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

/* ─── Design tokens ───────────────────────────── */
const BLUE = '#009DE0';
const BG = '#F4F4F4';
const CARD_BG = '#FFFFFF';
const TEXT = '#202125';
const TEXT2 = '#757575';
const BORDER = '#E8E8E8';
const SUCCESS = '#1BA672';
const WARNING = '#F58F1F';
const ERROR = '#E23437';

/* ─── Section card ────────────────────────────── */
const Section: React.FC<{ label?: string; title: string; children: React.ReactNode }> = ({ label, title, children }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
    <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: TEXT2 }}>{label}</p>
      )}
      <h2 className="text-[14px] font-black" style={{ color: TEXT }}>{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* ─── Star picker ─────────────────────────────── */
const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} onClick={() => onChange(i)} className="text-2xl leading-none">
        <span style={{ color: i <= value ? WARNING : BORDER }}>★</span>
      </button>
    ))}
  </div>
);

/* ─── Past couriers card ──────────────────────── */
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
    <div className="rounded-xl p-3" style={{ background: BG, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 mb-2">
        {courier.photo ? (
          <img src={courier.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-black"
            style={{ background: BLUE }}
          >
            {courier.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: TEXT }}>{courier.name}</p>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ color: i <= Math.round(courier.rating) ? WARNING : BORDER, fontSize: 12 }}>★</span>
            ))}
            <span className="text-[11px]" style={{ color: TEXT2 }}>{courier.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: isFavorite ? ERROR : TEXT2 }}
          >
            {isFavorite ? <HeartSolid className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowReview(!showReview)}
            className="px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: showReview ? BLUE : BORDER, color: showReview ? '#fff' : BLUE }}
          >
            {existingReview ? 'ערוך' : 'דרג'}
          </button>
        </div>
      </div>

      {showReview && (
        <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>דירוג השליח</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
            style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, direction: 'rtl' }}
            placeholder="הערה (אופציונלי)..."
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 rounded-2xl text-white text-[12px] font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ background: BLUE }}
          >
            {saving ? 'שומר...' : 'שמור ביקורת'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Clear Cache Floating Button ──────────────── */
const ClearCacheButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleClear = async () => {
    if (!window.confirm('לנקות את הקאש ולמשוך נתונים טריים מהשרת?')) return;
    setLoading(true);
    try {
      await clearCacheAndResync();
      window.location.reload();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed z-[999]"
      style={{ bottom: 80, left: 16 }}
      dir="rtl"
    >
      {expanded && (
        <div
          className="mb-2 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg"
          style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', minWidth: 200 }}
        >
          <button
            onClick={handleClear}
            disabled={loading}
            className="flex items-center gap-2 font-bold text-[13px] transition-all active:scale-95 disabled:opacity-60"
            style={{ color: '#009DE0' }}
          >
            <ArrowPathIcon className={`w-4 h-4 flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'מרענן...' : 'נקה קאש ורענן'}
          </button>
        </div>
      )}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
        style={{ background: '#009DE0' }}
        title="נקה קאש"
      >
        <ArrowPathIcon className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

/* ─── Chat Cleanup Section ────────────────────── */
type CleanupPeriod = 'manual' | 'daily' | 'weekly' | 'monthly' | 'on_complete';

const CLEANUP_OPTIONS: { value: CleanupPeriod; label: string; desc: string }[] = [
  { value: 'manual',      label: 'ידני בלבד',              desc: 'מחק שיחות רק כשאתה בוחר' },
  { value: 'on_complete', label: 'כשמשלוח הסתיים',         desc: 'מחיקה אוטומטית לאחר השלמת משלוח' },
  { value: 'daily',       label: 'ניקוי יומי',              desc: 'מחיקת שיחות ישנות מדי יום' },
  { value: 'weekly',      label: 'ניקוי שבועי',             desc: 'מחיקת שיחות ישנות מדי שבוע' },
  { value: 'monthly',     label: 'ניקוי חודשי',             desc: 'מחיקת שיחות ישנות מדי חודש' },
];

const DAYS_MAP: Record<CleanupPeriod, number> = { manual: 0, on_complete: 0, daily: 1, weekly: 7, monthly: 30 };

const ChatCleanupSection: React.FC<{ userId: string; userType: 'business' | 'courier' }> = ({ userId, userType }) => {
  const storageKey = `chat_cleanup_${userType}_${userId}`;
  const [period, setPeriod] = useState<CleanupPeriod>(() => {
    return (localStorage.getItem(storageKey) as CleanupPeriod) ?? 'manual';
  });
  const [cleaning, setCleaning] = useState(false);

  const savePeriod = (p: CleanupPeriod) => {
    setPeriod(p);
    localStorage.setItem(storageKey, p);
    toast.success('הגדרת ניקוי הצ\'אט נשמרה');
    // Run cleanup immediately if not manual
    if (p === 'on_complete') {
      cleanupCompletedDeliveryConvs(userId, userType);
    } else if (p !== 'manual') {
      cleanupOldConversations(userId, userType, DAYS_MAP[p]);
    }
  };

  const handleManualClean = () => {
    setCleaning(true);
    if (period === 'on_complete') {
      cleanupCompletedDeliveryConvs(userId, userType);
    } else if (period !== 'manual') {
      cleanupOldConversations(userId, userType, DAYS_MAP[period]);
    } else {
      cleanupOldConversations(userId, userType, 30); // default: 30 days
    }
    setCleaning(false);
    toast.success('צ\'אטים ישנים נוקו');
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: TEXT2 }}>ניהול פרטיות</p>
        <h2 className="text-[14px] font-black" style={{ color: TEXT }}>ניקוי צ׳אטים אוטומטי</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: TEXT2 }}>בחר מתי למחוק שיחות ישנות אוטומטית</p>
        <div className="space-y-2">
          {CLEANUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => savePeriod(opt.value)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all"
              style={{
                background: period === opt.value ? `${BLUE}12` : BG,
                border: `1.5px solid ${period === opt.value ? BLUE : BORDER}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: period === opt.value ? BLUE : BORDER }}
              >
                {period === opt.value && <div className="w-2 h-2 rounded-full" style={{ background: BLUE }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold" style={{ color: period === opt.value ? BLUE : TEXT }}>{opt.label}</p>
                <p className="text-[11px]" style={{ color: TEXT2 }}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={handleManualClean}
          disabled={cleaning}
          className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60"
          style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT2 }}
        >
          {cleaning ? 'מנקה...' : 'נקה עכשיו'}
        </button>
      </div>
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
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4" style={{ background: BG, minHeight: '100vh' }}>

      {/* Profile header card */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center relative"
        style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
      >
        <div className="relative mb-4">
          {biz?.logo ? (
            <img
              src={biz.logo}
              alt="לוגו"
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: `3px solid ${BLUE}` }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-[28px] font-black"
              style={{ background: BLUE }}
            >
              {biz?.businessName?.[0] ?? '?'}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center shadow"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <CameraIcon className="w-4 h-4" style={{ color: BLUE }} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>

        <h1 className="text-[20px] font-black" style={{ color: TEXT }}>{biz?.businessName ?? 'עסק'}</h1>
        <p className="text-[13px] mt-1" style={{ color: TEXT2 }}>{biz?.category ?? ''}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: BORDER }}>
        {(['info', 'couriers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
            style={{
              background: activeTab === t ? CARD_BG : 'transparent',
              color: activeTab === t ? BLUE : TEXT2,
              boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t === 'info' ? 'פרטים' : `שליחים (${pastCouriers.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <>
          {/* Email notifications */}
          <Section label="הגדרות" title="התראות מייל">
            <div className="space-y-3">
              {([
                { key: 'emailOnDeliveryAdded' as keyof StoredBusiness, label: 'משלוח חדש נוצר', desc: 'קבל מייל כשנוצר משלוח חדש' },
                { key: 'emailOnDeliveryAccepted' as keyof StoredBusiness, label: 'שליח קיבל משלוח', desc: 'כששליח מקבל את המשלוח שלך' },
                { key: 'emailOnDeliveryPickedUp' as keyof StoredBusiness, label: 'חבילה נאספה', desc: 'כשהשליח אסף את החבילה' },
                { key: 'emailOnDeliveryDelivered' as keyof StoredBusiness, label: 'משלוח נמסר ללקוח', desc: 'כשהמשלוח הגיע ליעד' },
                { key: 'emailOnDeliveryCancelled' as keyof StoredBusiness, label: 'משלוח בוטל', desc: 'כשמשלוח מבוטל' },
              ]).map(({ key, label, desc }) => (
                <div key={key as string} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: TEXT }}>{label}</p>
                    <p className="text-[11px]" style={{ color: TEXT2 }}>{desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!biz) return;
                      const next = !biz[key];
                      const updated = updateBusiness(businessId, { [key]: next } as Partial<StoredBusiness>);
                      setBiz(updated);
                      toast.success(next ? 'הופעל' : 'כובה');
                    }}
                    className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ background: biz?.[key] ? BLUE : BORDER }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: biz?.[key] ? '26px' : '2px' }}
                    />
                  </button>
                </div>
              ))}
              <p className="text-[10px] pt-1" style={{ color: '#C0C0C0' }}>
                * דורש הגדרת שירות מייל בהגדרות האדמין
              </p>
            </div>
          </Section>

          {/* Support — opens directly in the chat messages area */}
          <Link
            to="/business/chat?support=1"
            className="rounded-2xl p-4 flex items-center gap-3 transition-all hover:shadow-md"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}`, display: 'flex' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}15` }}>
              <span className="text-[18px]">🎧</span>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-black" style={{ color: TEXT }}>צור קשר / תמיכה</p>
              <p className="text-[11px]" style={{ color: TEXT2 }}>שלח הודעה לצוות התמיכה</p>
            </div>
            <span style={{ color: TEXT2 }}>{'<'}</span>
          </Link>

          {/* Details section */}
          <Section label="פרופיל" title="פרטי עסק">
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
                  <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${BG}` }}>
                    <span className="text-[11px] font-semibold" style={{ color: TEXT2 }}>{label}</span>
                    <span className="text-[13px] font-bold" style={{ color: TEXT }}>{value || '—'}</span>
                  </div>
                ))}
                <button
                  onClick={() => setEditMode(true)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                  style={{ background: BG, color: BLUE, border: `1px solid ${BORDER}` }}
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
                    <label className="text-[11px] font-semibold block mb-1" style={{ color: TEXT2 }}>{label}</label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                      style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, direction: 'rtl' }}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: TEXT2 }}>קטגוריה</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, direction: 'rtl' }}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveDetails}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-white font-bold text-[13px] transition-all active:scale-95"
                    style={{ background: BLUE }}
                  >
                    <CheckIcon className="w-4 h-4" />
                    שמור
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                    style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Password change */}
          <Section label="אבטחה" title="שינוי סיסמה">
            {!pwMode ? (
              <button
                onClick={() => setPwMode(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95"
                style={{ background: BG, color: BLUE, border: `1px solid ${BORDER}` }}
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
                    <label className="text-[11px] font-semibold block mb-1" style={{ color: TEXT2 }}>{label}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                      style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, direction: 'rtl' }}
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                    />
                  </div>
                ))}
                {pwError && (
                  <p className="text-[12px] font-semibold" style={{ color: ERROR }}>{pwError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={savingPw}
                    className="flex-1 py-2.5 rounded-2xl text-white font-bold text-[13px] transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: BLUE }}
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => { setPwMode(false); setPwError(''); setOldPw(''); setNewPw(''); setConfirmPw(''); }}
                    className="px-4 py-2.5 rounded-xl font-bold text-[13px]"
                    style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
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
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <TruckIcon className="w-10 h-10" style={{ color: BORDER }} />
              <p className="font-bold text-[14px]" style={{ color: TEXT2 }}>
                עדיין לא עבדת עם שליחים
              </p>
              <p className="text-[12px]" style={{ color: TEXT2 }}>
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

      {/* ── Chat Cleanup Settings ── */}
      <ChatCleanupSection userId={businessId} userType="business" />

      {/* Clear cache */}
      <ClearCacheButton />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl font-black text-[15px] transition-all active:scale-95"
        style={{ background: CARD_BG, border: `1px solid ${ERROR}40`, color: ERROR }}
      >
        התנתקות
      </button>
    </div>
  );
};

export default BusinessProfile;
