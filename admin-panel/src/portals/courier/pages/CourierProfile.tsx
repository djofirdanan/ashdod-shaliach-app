import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store';
import { logoutUser } from '../../../store/authSlice';
import { clearCacheAndResync, syncDown } from '../../../services/sync.service';
import {
  getCourier,
  updateCourier,
  getDeliveriesByCourier,
  getBusiness,
  getReviewsByTarget,
  addReview,
  verifyPassword,
  hashPassword,
  cleanupOldConversations,
  cleanupCompletedDeliveryConvs,
  deleteAllConversations,
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
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { Headphones, MapTrifold, MapPin as PhosphorMapPin, AppleLogo, Warning } from '@phosphor-icons/react';
import CityMultiSelect from '../../../components/CityMultiSelect';
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
        <span key={i} style={{ color: i <= Math.round(rating) ? WARNING : BORDER, fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} onClick={() => onChange(i)} className="text-2xl leading-none">
        <span style={{ color: i <= value ? WARNING : BORDER }}>★</span>
      </button>
    ))}
  </div>
);

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
    <div className="rounded-xl p-3" style={{ background: BG, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 mb-2">
        {business.logo ? (
          <img src={business.logo} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-[14px] font-black"
            style={{ background: BLUE }}
          >
            {business.businessName[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: TEXT }}>{business.businessName}</p>
          <div className="flex items-center gap-1">
            <StarRating rating={business.rating} />
            <span className="text-[11px]" style={{ color: TEXT2 }}>{business.rating.toFixed(1)}</span>
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
          <p className="text-[11px] font-semibold" style={{ color: TEXT2 }}>דירוג העסק</p>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
            style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT, direction: 'rtl' }}
            placeholder="הערה (אופציונלי)..."
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded-2xl text-white text-[12px] font-bold transition-all active:scale-95"
              style={{ background: BLUE }}
            >
              שמור
            </button>
            <button
              onClick={() => setShowReview(false)}
              className="px-3 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: BORDER, color: TEXT2 }}
            >
              ביטול
            </button>
          </div>
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
  { value: 'manual',      label: 'ידני בלבד',          desc: 'מחק שיחות רק כשאתה בוחר' },
  { value: 'on_complete', label: 'כשמשלוח הסתיים',     desc: 'מחיקה אוטומטית לאחר השלמת משלוח' },
  { value: 'daily',       label: 'ניקוי יומי',          desc: 'מחיקת שיחות ישנות מדי יום' },
  { value: 'weekly',      label: 'ניקוי שבועי',         desc: 'מחיקת שיחות ישנות מדי שבוע' },
  { value: 'monthly',     label: 'ניקוי חודשי',         desc: 'מחיקת שיחות ישנות מדי חודש' },
];
const DAYS_MAP: Record<CleanupPeriod, number> = { manual: 0, on_complete: 0, daily: 1, weekly: 7, monthly: 30 };

const ChatCleanupSection: React.FC<{ userId: string; userType: 'business' | 'courier' }> = ({ userId, userType }) => {
  const storageKey = `chat_cleanup_${userType}_${userId}`;
  const [period, setPeriod] = useState<CleanupPeriod>(() => (localStorage.getItem(storageKey) as CleanupPeriod) ?? 'manual');
  const [cleaning, setCleaning] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const savePeriod = (p: CleanupPeriod) => {
    setPeriod(p);
    localStorage.setItem(storageKey, p);
    toast.success('הגדרת ניקוי הצ\'אט נשמרה');
    if (p === 'on_complete') cleanupCompletedDeliveryConvs(userId, userType);
    else if (p !== 'manual') cleanupOldConversations(userId, userType, DAYS_MAP[p]);
  };
  const handleManualClean = () => {
    if (!showDeleteAll) { setShowDeleteAll(true); return; }
    setCleaning(true);
    if (period === 'on_complete') cleanupCompletedDeliveryConvs(userId, userType);
    else if (period !== 'manual') cleanupOldConversations(userId, userType, DAYS_MAP[period]);
    else deleteAllConversations(userId, userType);
    setCleaning(false);
    setShowDeleteAll(false);
    toast.success('הצ\'אטים נוקו');
  };
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#757575' }}>ניהול פרטיות</p>
        <h2 className="text-[14px] font-black" style={{ color: TEXT }}>ניקוי צ׳אטים</h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[12px]" style={{ color: '#757575' }}>בחר מתי למחוק שיחות ישנות אוטומטית</p>
        <div className="space-y-2">
          {CLEANUP_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => savePeriod(opt.value)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-right transition-all"
              style={{ background: period === opt.value ? `${BLUE}12` : BG, border: `1.5px solid ${period === opt.value ? BLUE : BORDER}` }}
            >
              <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: period === opt.value ? BLUE : BORDER }}>
                {period === opt.value && <div className="w-2 h-2 rounded-full" style={{ background: BLUE }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold" style={{ color: period === opt.value ? BLUE : TEXT }}>{opt.label}</p>
                <p className="text-[11px]" style={{ color: '#757575' }}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {/* Delete now button */}
        {!showDeleteAll ? (
          <button onClick={() => setShowDeleteAll(true)} disabled={cleaning}
            className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95 disabled:opacity-60"
            style={{ background: BG, border: `1px solid ${BORDER}`, color: '#757575' }}
          >
            {cleaning ? 'מנקה...' : 'נקה עכשיו'}
          </button>
        ) : (
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#FFF5F5', border: '1px solid #E2343740' }}>
            <p className="text-[12px] font-bold text-center flex items-center justify-center gap-1" style={{ color: ERROR }}><Warning size={13} /> פעולה זו תמחק את כל השיחות. לא ניתן לשחזר.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteAll(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold"
                style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}>
                ביטול
              </button>
              <button onClick={handleManualClean} disabled={cleaning}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold text-white"
                style={{ background: ERROR }}>
                {cleaning ? 'מוחק...' : 'מחק הכל'}
              </button>
            </div>
          </div>
        )}
      </div>
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
  const [editBitPhone, setEditBitPhone] = useState('');
  const [editNavPref, setEditNavPref] = useState<'waze' | 'google' | 'apple'>('waze');
  const [editServiceCities, setEditServiceCities] = useState<string[]>([]);

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
      setEditBitPhone(c.bitPhone ?? '');
      setEditNavPref(c.navPreference ?? 'waze');
      setEditServiceCities(c.serviceCities ?? []);
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

  useEffect(() => {
    if (!courierId) return;
    // Pull fresh data from Supabase so profile always loads even after cache clear
    syncDown().catch(() => {}).finally(() => loadData());
  }, [courierId]);

  /* Photo upload */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courierId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      try {
        const updated = updateCourier(courierId, { photo: base64 });
        setCourier(updated);
        toast.success('התמונה עודכנה!');
      } catch {
        toast.error('שגיאה בעדכון התמונה, נסה שוב');
      }
    };
    reader.readAsDataURL(file);
  };

  /* Edit save */
  const handleSaveDetails = async () => {
    if (!courierId) return;
    try {
      const updated = updateCourier(courierId, {
        name: editName.trim(),
        phone: editPhone.trim(),
        vehicle: editVehicle,
        vehiclePlate: editPlate.trim() || undefined,
        bitPhone: editBitPhone.trim() || undefined,
        navPreference: editNavPref,
        serviceCities: editServiceCities,
      });
      setCourier(updated);
      setEditMode(false);
      toast.success('הפרטים עודכנו!');
    } catch {
      // Courier not found in cache — sync then retry
      try {
        await syncDown();
        loadData();
        toast.error('ניסה שוב — נא ללחוץ שמור שוב');
      } catch {
        toast.error('שגיאה בשמירה, נסה שוב');
      }
    }
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
    toast.success(next ? 'אתה זמין לקבל משלוחים' : 'סימנת את עצמך כלא זמין');
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
    <div className="w-full max-w-[1200px] mx-auto px-4 py-5" style={{ background: BG, minHeight: '100vh' }} dir="rtl">

      {/* ── Desktop 2-column layout ── */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

        {/* ── LEFT COLUMN: Profile header + stats + tabs ── */}
        <div className="space-y-4">

          {/* Profile header card */}
          <div className="rounded-2xl p-6 flex flex-col items-center text-center" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <div className="relative mb-4">
              {courier?.photo ? (
                <img src={courier.photo} alt="פרופיל" className="w-24 h-24 rounded-full object-cover" style={{ border: `3px solid ${BLUE}` }} />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-[32px] font-black" style={{ background: BLUE }}>
                  {courier?.name?.[0] ?? '?'}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full flex items-center justify-center shadow cursor-pointer"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
              >
                <CameraIcon className="w-4 h-4" style={{ color: BLUE }} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <h1 className="text-[20px] font-black" style={{ color: TEXT }}>{courier?.name ?? 'שליח'}</h1>
            <p className="text-[13px] mt-1" style={{ color: TEXT2 }}>
              {courier ? vehicleLabel[courier.vehicle] : ''}
              {courier?.vehiclePlate ? ` · ${courier.vehiclePlate}` : ''}
            </p>
            <div className="flex gap-0.5 mt-2">
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{ color: i <= Math.round(courier?.rating ?? 5) ? WARNING : BORDER, fontSize: 18 }}>★</span>
              ))}
            </div>
            <button
              onClick={toggleAvailability}
              className="mt-4 px-5 py-2 rounded-full font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              style={{ background: isAvailable ? `${SUCCESS}18` : `${ERROR}18`, border: `1px solid ${isAvailable ? SUCCESS : ERROR}40`, color: isAvailable ? SUCCESS : ERROR }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: isAvailable ? SUCCESS : ERROR }} />
              {isAvailable ? 'זמין לקבל משלוחים' : 'לא זמין כרגע'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <p className="text-[22px] font-black" style={{ color: BLUE }}>{courier?.totalDeliveries ?? 0}</p>
              <p className="text-[11px] mt-1" style={{ color: TEXT2 }}>משלוחים הושלמו</p>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <p className="text-[22px] font-black" style={{ color: SUCCESS }}>₪{courier?.earnings.total ?? 0}</p>
              <p className="text-[11px] mt-1" style={{ color: TEXT2 }}>סה"כ הכנסות</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: BORDER }}>
            {(['info', 'businesses'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer"
                style={{ background: activeTab === t ? CARD_BG : 'transparent', color: activeTab === t ? BLUE : TEXT2, boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
              >
                {t === 'info' ? 'פרטים' : `עסקים (${pastBusinesses.length})`}
              </button>
            ))}
          </div>

          {/* Support */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            onClick={() => navigate('/courier/chat?support=1')}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BLUE}15` }}>
              <Headphones size={20} style={{ color: BLUE }} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-black" style={{ color: TEXT }}>צור קשר / תמיכה</p>
              <p className="text-[11px]" style={{ color: TEXT2 }}>שלח הודעה לצוות התמיכה</p>
            </div>
            <span style={{ color: TEXT2 }}>{'<'}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full py-4 rounded-2xl font-black text-[15px] transition-all active:scale-95 cursor-pointer"
            style={{ background: CARD_BG, border: `1px solid ${ERROR}40`, color: ERROR }}
          >
            התנתקות
          </button>
        </div>

        {/* ── RIGHT COLUMN: Settings / forms ── */}
        <div className="space-y-4">

          {activeTab === 'info' && (
            <>
              {/* Edit details */}
              <Section label="פרופיל" title="פרטים אישיים">
                {!editMode ? (
                  <>
                    <div className="lg:grid lg:grid-cols-2 lg:gap-x-6">
                      {[
                        { label: 'שם מלא', value: courier?.name },
                        { label: 'אימייל', value: courier?.email },
                        { label: 'טלפון', value: courier?.phone },
                        { label: 'רכב', value: courier ? vehicleLabel[courier.vehicle] : '' },
                        { label: 'מספר רכב', value: courier?.vehiclePlate },
                        { label: 'Bit', value: courier?.bitPhone },
                        { label: 'ניווט', value: courier?.navPreference === 'waze' ? 'Waze' : courier?.navPreference === 'apple' ? 'Apple Maps' : courier?.navPreference === 'google' ? 'Google Maps' : 'Waze (ברירת מחדל)' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${BG}` }}>
                          <span className="text-[11px] font-semibold" style={{ color: TEXT2 }}>{label}</span>
                          <span className="text-[13px] font-bold" style={{ color: TEXT }}>{value || '—'}</span>
                        </div>
                      ))}
                    </div>
                    {/* Service cities in view mode */}
                    {(courier?.serviceCities ?? []).length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BG}` }}>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: TEXT2 }}>ערים פעיל בהן</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(courier?.serviceCities ?? []).map((city) => (
                            <span
                              key={city}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold"
                              style={{ background: '#EEF8FF', color: BLUE }}
                            >
                              {city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setEditMode(true)}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95 cursor-pointer"
                      style={{ background: BG, color: BLUE, border: `1px solid ${BORDER}` }}
                    >
                      <PencilIcon className="w-4 h-4" />
                      ערוך פרטים
                    </button>
                  </>
                ) : (
                  <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                    {[
                      { label: 'שם מלא', value: editName, setter: setEditName },
                      { label: 'טלפון', value: editPhone, setter: setEditPhone },
                      { label: 'מספר רכב', value: editPlate, setter: setEditPlate },
                      { label: 'טלפון לתשלום Bit', value: editBitPhone, setter: setEditBitPhone },
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
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: TEXT2 }}>סוג רכב</label>
                      <div className="grid grid-cols-2 gap-2">
                        {vehicleOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setEditVehicle(opt.value)}
                            className="py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                            style={{ background: editVehicle === opt.value ? BLUE : BG, color: editVehicle === opt.value ? '#fff' : TEXT2, border: `1px solid ${editVehicle === opt.value ? BLUE : BORDER}` }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: TEXT2 }}>אפליקציית ניווט מועדפת</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: 'waze', label: 'Waze', icon: <MapTrifold size={12} /> },
                          { value: 'google', label: 'גוגל', icon: <PhosphorMapPin size={12} /> },
                          { value: 'apple', label: 'Apple', icon: <AppleLogo size={12} /> },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setEditNavPref(opt.value)}
                            className="py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            style={{ background: editNavPref === opt.value ? BLUE : BG, color: editNavPref === opt.value ? '#fff' : TEXT2, border: `1px solid ${editNavPref === opt.value ? BLUE : BORDER}` }}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Service cities in edit mode */}
                    <div className="lg:col-span-2">
                      <label className="text-[11px] font-semibold block mb-1" style={{ color: TEXT2 }}>ערים שאני פעיל בהן</label>
                      <CityMultiSelect
                        selected={editServiceCities}
                        onChange={setEditServiceCities}
                      />
                    </div>

                    <div className="lg:col-span-2 flex gap-2 pt-1">
                      <button
                        onClick={handleSaveDetails}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-white font-bold text-[13px] transition-all active:scale-95 cursor-pointer"
                        style={{ background: BLUE }}
                      >
                        <CheckIcon className="w-4 h-4" />
                        שמור
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2.5 rounded-xl font-bold text-[13px] cursor-pointer"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all active:scale-95 cursor-pointer"
                    style={{ background: BG, color: BLUE, border: `1px solid ${BORDER}` }}
                  >
                    <KeyIcon className="w-4 h-4" />
                    שנה סיסמה
                  </button>
                ) : (
                  <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
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
                    {pwError && <p className="text-[12px] font-semibold lg:col-span-3" style={{ color: ERROR }}>{pwError}</p>}
                    <div className="flex gap-2 lg:col-span-3">
                      <button
                        onClick={handlePasswordChange}
                        className="flex-1 py-2.5 rounded-2xl text-white font-bold text-[13px] transition-all active:scale-95 cursor-pointer"
                        style={{ background: BLUE }}
                      >
                        שמור
                      </button>
                      <button
                        onClick={() => { setPwMode(false); setPwError(''); setOldPw(''); setNewPw(''); setConfirmPw(''); }}
                        className="px-4 py-2.5 rounded-xl font-bold text-[13px] cursor-pointer"
                        style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </Section>

              {/* Email notifications */}
              <Section label="הגדרות" title="התראות מייל">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: TEXT }}>משלוח חדש זמין</p>
                      <p className="text-[11px]" style={{ color: TEXT2 }}>קבל מייל כשמשלוח חדש מתפרסם</p>
                    </div>
                    <button
                      onClick={() => {
                        if (!courier) return;
                        const next = !courier.emailOnNewDelivery;
                        const updated = updateCourier(courierId, { emailOnNewDelivery: next });
                        setCourier(updated);
                        toast.success(next ? 'התראות מייל הופעלו' : 'התראות מייל כובו');
                      }}
                      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                      style={{ background: courier?.emailOnNewDelivery ? BLUE : BORDER }}
                    >
                      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: courier?.emailOnNewDelivery ? '26px' : '2px' }} />
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color: '#C0C0C0' }}>
                    * דורש הגדרת שירות מייל (EmailJS / SMTP) בהגדרות האדמין
                  </p>
                </div>
              </Section>
            </>
          )}

          {activeTab === 'businesses' && (
            <div className="space-y-3">
              {pastBusinesses.length === 0 ? (
                <div className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                  <BuildingStorefrontIcon className="w-10 h-10" style={{ color: BORDER }} />
                  <p className="font-bold text-[14px]" style={{ color: TEXT2 }}>עדיין לא עבדת עם עסקים</p>
                  <p className="text-[12px]" style={{ color: TEXT2 }}>לאחר שתמסור משלוח, העסק יופיע כאן</p>
                </div>
              ) : (
                <div className="lg:grid lg:grid-cols-2 lg:gap-3 space-y-3 lg:space-y-0">
                  {pastBusinesses.map(({ business, deliveryId }) => (
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Cleanup Settings */}
          <ChatCleanupSection userId={courierId} userType="courier" />

        </div>{/* end right column */}
      </div>{/* end desktop grid */}

      {/* Logout button */}
      <div className="px-4 pb-8">
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-2xl font-black text-[15px] transition-all active:scale-95"
          style={{ background: '#FFFFFF', border: '1px solid #E2343740', color: '#E23437' }}
        >
          התנתקות
        </button>
      </div>

      {/* Clear cache */}
      <ClearCacheButton />

      {/* Availability confirmation */}
      {showAvailConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAvailConfirm(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: CARD_BG, boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}
            dir="rtl"
          >
            <div className="flex justify-center mb-3">
              <span className="w-10 h-10 rounded-full" style={{ background: isAvailable ? ERROR : SUCCESS, display: 'inline-block' }} />
            </div>
            <h3 className="text-[17px] font-black mb-2" style={{ color: TEXT }}>
              {isAvailable ? 'לסמן כלא זמין?' : 'לסמן כזמין?'}
            </h3>
            <p className="text-[13px] mb-5" style={{ color: TEXT2 }}>
              {isAvailable
                ? 'לא תקבל משלוחים חדשים כל עוד אתה מסומן כלא זמין'
                : 'תתחיל לקבל התראות על משלוחים חדשים'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAvailConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-[14px]"
                style={{ background: BG, color: TEXT2, border: `1px solid ${BORDER}` }}
              >
                ביטול
              </button>
              <button
                onClick={confirmToggleAvailability}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] text-white"
                style={{ background: isAvailable ? ERROR : SUCCESS }}
              >
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
