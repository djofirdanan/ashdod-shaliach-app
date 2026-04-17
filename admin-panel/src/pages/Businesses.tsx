import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BuildingStorefrontIcon,
  TruckIcon,
  StarIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BoltIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import * as storageService from '../services/storage.service';
import type { StoredBusiness } from '../services/storage.service';
import { decodePassword } from '../services/storage.service';
import { syncDown } from '../services/sync.service';
import { addBusinessAsync, updateBusinessAsync } from '../services/storage.service';
import { formatCurrency } from '../utils/formatters';
import { DEFAULT_PRICING_ZONES } from '../utils/constants';
import { setUser, setPortalUser } from '../store/authSlice';
import { sendAccountApproved } from '../services/email.service';
import type { RootState } from '../store';

const CATEGORIES = ['מסעדה', 'בית קפה', 'מכולת', 'פרמצ׳יה', 'אחר'];
const zones = DEFAULT_PRICING_ZONES.map((z) => z.name);

const categoryColors: Record<string, string> = {
  'מסעדה': 'orange',
  'בית קפה': 'brown',
  'מכולת': 'blue',
  'פרמצ׳יה': 'green',
  'אחר': 'gray',
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-1">
    <StarSolid className="w-4 h-4 text-yellow-400" />
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
  </div>
);

// ─── Business Form ────────────────────────────────────────────
interface BizFormState {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zone: string;
  category: string;
  password: string;
  isActive: boolean;
  balance: number;
}

const emptyBizForm = (): BizFormState => ({
  businessName: '', contactPerson: '', email: '', phone: '',
  street: '', city: 'אשדוד', zone: '', category: 'מסעדה',
  password: '', isActive: true, balance: 0,
});

interface BizFormProps {
  value: BizFormState;
  onChange: (v: BizFormState) => void;
  editMode?: boolean;
  currentPasswordHash?: string;
}

const BizForm: React.FC<BizFormProps> = ({ value, onChange, editMode, currentPasswordHash }) => {
  const [showPw, setShowPw] = React.useState(false);
  const currentPw = currentPasswordHash ? decodePassword(currentPasswordHash) : '';
  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="שם העסק *" value={value.businessName} onChange={(e) => onChange({ ...value, businessName: e.target.value })} />
        <Input label="איש קשר *" value={value.contactPerson} onChange={(e) => onChange({ ...value, contactPerson: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="אימייל *" type="email" dir="ltr" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        <Input label="טלפון *" type="tel" dir="ltr" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="רחוב *" value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} />
        <Input label="עיר" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>אזור</label>
          <select value={value.zone} onChange={(e) => onChange({ ...value, zone: e.target.value })}
            className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none" style={{ borderColor: '#e0e6ed', background: '#f8fafc', color: '#061b31', fontFamily: 'inherit' }}>
            <option value="">-- בחר --</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>קטגוריה</label>
          <select value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}
            className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none" style={{ borderColor: '#e0e6ed', background: '#f8fafc', color: '#061b31', fontFamily: 'inherit' }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Password section */}
      {editMode && currentPw && (
        <div className="rounded-xl p-3" style={{ background: '#f0f4ff', border: '1px solid #d0d9f7' }}>
          <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">סיסמה נוכחית</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-gray-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              {showPw ? currentPw : '••••••••'}
            </code>
            <button type="button" onClick={() => setShowPw(!showPw)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
              {showPw ? <EyeSlashIcon className="w-4 h-4 text-gray-500" /> : <EyeIcon className="w-4 h-4 text-gray-500" />}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Input
            label={editMode ? 'סיסמה חדשה (ריק = ללא שינוי)' : 'סיסמה *'}
            type="password" dir="ltr"
            placeholder="••••••"
            value={value.password}
            onChange={(e) => onChange({ ...value, password: e.target.value })}
          />
        </div>
        <Input label="יתרה (₪)" type="number" dir="ltr" value={String(value.balance)} onChange={(e) => onChange({ ...value, balance: Number(e.target.value) })} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} className="w-4 h-4 accent-purple-600" />
        <span className="text-sm font-medium text-gray-700">פעיל</span>
      </label>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const Businesses: React.FC = () => {
  const [businesses, setBusinesses] = useState<StoredBusiness[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; biz: StoredBusiness | null }>({ open: false, biz: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; biz: StoredBusiness | null }>({ open: false, biz: null });
  const [blockModal, setBlockModal] = useState<{ open: boolean; biz: StoredBusiness | null }>({ open: false, biz: null });
  const [blockReason, setBlockReason] = useState('');
  const [credModal, setCredModal] = useState<{ open: boolean; biz: StoredBusiness | null }>({ open: false, biz: null });
  const [showCredPw, setShowCredPw] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState<BizFormState>(emptyBizForm());
  const [editForm, setEditForm] = useState<BizFormState>(emptyBizForm());

  const [isSaving, setIsSaving] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentAdminUser = useSelector((state: RootState) => state.auth.user);

  const load = useCallback(() => {
    setBusinesses(storageService.getBusinesses());
  }, []);

  useEffect(() => {
    // Sync from Supabase first so admin sees all registrations (including from other devices)
    syncDown().finally(load);
  }, [load]);

  const filtered = businesses.filter((b) => {
    const matchSearch = !search ||
      b.businessName.includes(search) ||
      b.email.includes(search) ||
      b.phone.includes(search);
    const matchCat = categoryFilter === 'all' || b.category === categoryFilter;
    const matchStatus = statusFilter === 'all' ? true
      : statusFilter === 'active' ? (b.isActive && !b.isBlocked)
      : statusFilter === 'pending' ? (!b.isActive && !b.isBlocked)
      : statusFilter === 'blocked' ? b.isBlocked
      : true;
    return matchSearch && matchCat && matchStatus;
  });

  const categories = ['all', ...Array.from(new Set(businesses.map((b) => b.category)))];

  // Stats
  const totalCount = businesses.length;
  const activeCount = businesses.filter((b) => b.isActive && !b.isBlocked).length;
  const totalDeliveries = businesses.reduce((s, b) => s + b.totalDeliveries, 0);

  // ── Add ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.businessName || !addForm.contactPerson || !addForm.email || !addForm.phone || !addForm.street || !addForm.password) {
      toast.error('נא למלא את כל השדות החובה');
      return;
    }
    if (storageService.getBusinessByEmail(addForm.email)) {
      toast.error('אימייל כבר קיים במערכת');
      return;
    }
    setIsSaving(true);
    try {
      await addBusinessAsync({
        email: addForm.email,
        password: storageService.hashPassword(addForm.password),
        businessName: addForm.businessName,
        contactPerson: addForm.contactPerson,
        phone: addForm.phone,
        address: { street: addForm.street, city: addForm.city, zone: addForm.zone || undefined },
        category: addForm.category,
        isActive: addForm.isActive,
        isBlocked: false,
        balance: addForm.balance,
        totalDeliveries: 0,
        rating: 5,
      });
      toast.success('עסק נוסף בהצלחה');
      setAddModal(false);
      setAddForm(emptyBizForm());
      load();
    } catch { toast.error('שגיאה בהוספת עסק'); }
    finally { setIsSaving(false); }
  };

  // ── Edit ──
  const openEdit = (biz: StoredBusiness) => {
    setEditForm({
      businessName: biz.businessName,
      contactPerson: biz.contactPerson,
      email: biz.email,
      phone: biz.phone,
      street: biz.address.street,
      city: biz.address.city,
      zone: biz.address.zone || '',
      category: biz.category,
      password: '',
      isActive: biz.isActive,
      balance: biz.balance,
    });
    setEditModal({ open: true, biz });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.biz) return;
    setIsSaving(true);
    const wasInactive = !editModal.biz.isActive;
    const nowActive = editForm.isActive;
    try {
      const updateData: Partial<StoredBusiness> = {
        businessName: editForm.businessName,
        contactPerson: editForm.contactPerson,
        email: editForm.email,
        phone: editForm.phone,
        address: { street: editForm.street, city: editForm.city, zone: editForm.zone || undefined },
        category: editForm.category,
        isActive: editForm.isActive,
        balance: editForm.balance,
      };
      if (editForm.password.trim()) {
        updateData.password = storageService.hashPassword(editForm.password.trim());
      }
      await updateBusinessAsync(editModal.biz.id, updateData);
      // Send approval email when admin activates a previously inactive account
      if (wasInactive && nowActive) {
        sendAccountApproved(editForm.email, editForm.businessName).catch(() => {});
        toast.success('העסק אושר ומייל אישור נשלח!');
      } else {
        toast.success('עסק עודכן בהצלחה');
      }
      setEditModal({ open: false, biz: null });
      load();
    } catch { toast.error('שגיאה בעדכון עסק'); }
    finally { setIsSaving(false); }
  };

  // ── Delete ──
  const handleDelete = () => {
    if (!deleteModal.biz) return;
    storageService.deleteBusiness(deleteModal.biz.id);
    toast.success('עסק נמחק');
    setDeleteModal({ open: false, biz: null });
    load();
  };

  // ── Block/Unblock ──
  const handleBlock = () => {
    if (!blockModal.biz) return;
    storageService.updateBusiness(blockModal.biz.id, {
      isBlocked: true,
      blockedReason: blockReason || 'חסום על ידי מנהל',
    });
    toast.success(`עסק ${blockModal.biz.businessName} נחסם`);
    setBlockModal({ open: false, biz: null });
    setBlockReason('');
    load();
  };

  const handleUnblock = (biz: StoredBusiness) => {
    storageService.updateBusiness(biz.id, { isBlocked: false, blockedReason: undefined });
    toast.success(`חסימת ${biz.businessName} בוטלה`);
    load();
  };

  // ── Quick Login (Impersonation) ──
  const handleQuickLogin = (biz: StoredBusiness) => {
    // Backup current admin session
    const currentToken = localStorage.getItem('admin_token');
    if (currentToken) localStorage.setItem('admin_token_backup', currentToken);
    if (currentAdminUser) localStorage.setItem('admin_user_backup', JSON.stringify(currentAdminUser));

    // Set business token
    localStorage.setItem('admin_token', `business-${biz.id}`);

    // Update Redux state to impersonate the business
    dispatch(setUser({
      id: biz.id,
      name: biz.businessName,
      email: biz.email,
      role: 'admin',
      createdAt: biz.createdAt,
    }));
    dispatch(setPortalUser({ id: biz.id, type: 'business', name: biz.businessName }));

    navigate('/');
    toast.success(`כניסה בשם: ${biz.businessName}`);
  };

  const pendingBizCount = businesses.filter((b) => !b.isActive && !b.isBlocked).length;

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── HEADER ── */}
      <div
        className="rounded-[12px] p-5 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'linear-gradient(135deg, #061b31 0%, #0f3460 60%, #2563EB 100%)',
          boxShadow: '0 10px 30px rgba(6,27,49,0.25)',
        }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <BuildingStorefrontIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-[1.2rem] font-black text-white tracking-tight">ניהול עסקים</h1>
          </div>
          <p className="text-[13px] mr-10" style={{ color: 'rgba(255,255,255,0.50)' }}>
            {totalCount} עסקים רשומים · {activeCount} פעילים כעת
          </p>
        </div>
        <button
          onClick={() => { setAddForm(emptyBizForm()); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-bold text-white transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
        >
          <PlusIcon className="w-4 h-4" />
          הוסף עסק
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'סה"כ עסקים', value: totalCount, icon: <BuildingStorefrontIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#2563EB,#1d4ed8)', color: '#2563EB' },
          { label: 'פעילים', value: activeCount, icon: <TruckIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#1db954,#00897b)', color: '#1db954' },
          { label: 'ממתינים לאישור', value: pendingBizCount, icon: <StarIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#F97316,#ea580c)', color: '#F97316' },
          { label: 'סה"כ משלוחים', value: totalDeliveries.toLocaleString(), icon: <TruckIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#533afd,#3d22e0)', color: '#533afd' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[10px] p-4 flex items-center gap-3"
            style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(50,50,93,0.06)' }}
          >
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-black leading-none" style={{ color: '#061b31' }}>{s.value}</p>
              <p className="text-[11px] mt-0.5 leading-tight" style={{ color: '#8898aa' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── PENDING ALERT ── */}
      {pendingBizCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[8px]"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1.5px solid rgba(249,115,22,0.30)' }}
        >
          <StarIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#F97316' }} />
          <p className="text-[13px] font-semibold flex-1" style={{ color: '#92400e' }}>
            {pendingBizCount} עס{pendingBizCount > 1 ? 'קים' : 'ק'} ממתינ{pendingBizCount > 1 ? 'ים' : ''} לאישור
          </p>
          <button
            onClick={() => setStatusFilter('pending')}
            className="text-[12px] font-bold px-3 py-1 rounded-full text-white flex-shrink-0"
            style={{ background: '#F97316' }}
          >
            סנן
          </button>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div
        className="rounded-[10px] p-4 flex flex-col sm:flex-row gap-3"
        style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(50,50,93,0.06)' }}
      >
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-[13px] rounded-[7px] outline-none transition-all"
            style={{ background: '#f6f9fc', border: '1.5px solid #e8ecf0', color: '#061b31', direction: 'rtl' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e8ecf0'; e.currentTarget.style.boxShadow = ''; }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[7px] text-[13px] outline-none"
          style={{ background: '#f6f9fc', border: '1.5px solid #e8ecf0', color: '#061b31', fontFamily: 'inherit', direction: 'rtl' }}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat === 'all' ? 'כל הקטגוריות' : cat}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[7px] text-[13px] outline-none"
          style={{ background: '#f6f9fc', border: '1.5px solid #e8ecf0', color: '#061b31', fontFamily: 'inherit', direction: 'rtl' }}
        >
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="pending">ממתין לאישור</option>
          <option value="blocked">חסום</option>
        </select>
      </div>

      {/* ── TABLE ── */}
      <div
        className="rounded-[10px] overflow-hidden"
        style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(50,50,93,0.06)' }}
      >
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f4ff', background: '#fafbff' }}>
                {['שם עסק', 'טלפון', 'קטגוריה', 'משלוחים', 'דירוג', 'יתרה', 'סטטוס', 'פעולות'].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-[11px] font-black uppercase tracking-wider" style={{ color: '#8898aa' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((biz) => {
                const isPending = !biz.isActive && !biz.isBlocked;
                return (
                  <tr
                    key={biz.id}
                    className="transition-colors cursor-pointer"
                    style={{
                      borderBottom: '1px solid #f6f9fc',
                      background: isPending ? 'rgba(249,115,22,0.03)' : 'transparent',
                      borderRight: isPending ? '3px solid #F97316' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isPending ? 'rgba(249,115,22,0.06)' : '#fafbff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isPending ? 'rgba(249,115,22,0.03)' : 'transparent'; }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white text-[13px] font-black"
                          style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
                        >
                          {biz.businessName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[13px] truncate" style={{ color: '#061b31' }}>{biz.businessName}</p>
                          <p className="text-[11px] truncate" style={{ color: '#8898aa' }}>{biz.contactPerson}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: '#525f7f' }} dir="ltr">{biz.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                        style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}
                      >
                        {biz.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-bold" style={{ color: '#061b31' }}>{biz.totalDeliveries.toLocaleString()}</td>
                    <td className="px-4 py-3"><RatingStars rating={biz.rating} /></td>
                    <td className="px-4 py-3 text-[13px] font-bold" style={{ color: biz.balance > 0 ? '#1db954' : biz.balance < 0 ? '#ea2261' : '#8898aa' }}>
                      {formatCurrency(biz.balance)}
                    </td>
                    <td className="px-4 py-3">
                      {biz.isBlocked
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(234,34,97,0.10)', color: '#ea2261' }}>⛔ חסום</span>
                        : biz.isActive
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(29,185,84,0.10)', color: '#1db954' }}>● פעיל</span>
                        : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>◐ ממתין</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* Quick approve for pending */}
                        {isPending && (
                          <button
                            title="אשר עסק"
                            onClick={async () => {
                              try {
                                await updateBusinessAsync(biz.id, { isActive: true });
                                sendAccountApproved(biz.email, biz.businessName).catch(() => {});
                                toast.success(`${biz.businessName} אושר!`);
                                load();
                              } catch { toast.error('שגיאה'); }
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-[6px] text-[11px] font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#1db954,#00897b)' }}
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            אשר
                          </button>
                        )}
                        <button title="פרטי גישה" onClick={() => { setShowCredPw(false); setCredModal({ open: true, biz }); }}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.20)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.10)'; }}>
                          <KeyIcon className="w-3.5 h-3.5" />
                        </button>
                        <button title="כניסה מהירה" onClick={() => handleQuickLogin(biz)}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(83,58,253,0.10)', color: '#533afd' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(83,58,253,0.20)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(83,58,253,0.10)'; }}>
                          <BoltIcon className="w-3.5 h-3.5" />
                        </button>
                        <button title="עריכה" onClick={() => openEdit(biz)}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.20)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.10)'; }}>
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => biz.isBlocked ? handleUnblock(biz) : setBlockModal({ open: true, biz })}
                          className="p-1.5 rounded-[5px] transition-colors"
                          style={biz.isBlocked
                            ? { background: 'rgba(29,185,84,0.10)', color: '#1db954' }
                            : { background: 'rgba(234,34,97,0.10)', color: '#ea2261' }
                          }
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                        >
                          {biz.isBlocked ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <NoSymbolIcon className="w-3.5 h-3.5" />}
                        </button>
                        <button title="מחיקה" onClick={() => setDeleteModal({ open: true, biz })}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(156,163,175,0.12)', color: '#6b7280' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,34,97,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = '#ea2261'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(156,163,175,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}>
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y" style={{ borderColor: '#f6f9fc' }}>
          {filtered.map((biz) => {
            const isPending = !biz.isActive && !biz.isBlocked;
            return (
              <div
                key={biz.id}
                className="p-4 space-y-3"
                style={{
                  borderRight: isPending ? '3px solid #F97316' : '3px solid transparent',
                  background: isPending ? 'rgba(249,115,22,0.03)' : 'white',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-[8px] flex items-center justify-center text-white text-[14px] font-black flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
                    >
                      {biz.businessName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[14px]" style={{ color: '#061b31' }}>{biz.businessName}</p>
                      <p className="text-[11px]" style={{ color: '#8898aa' }}>{biz.contactPerson}</p>
                    </div>
                  </div>
                  {biz.isBlocked
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(234,34,97,0.10)', color: '#ea2261' }}>חסום</span>
                    : biz.isActive
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(29,185,84,0.10)', color: '#1db954' }}>פעיל</span>
                    : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>ממתין</span>
                  }
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: '#8898aa' }} dir="ltr">{biz.phone}</span>
                  <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB' }}>{biz.category}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {isPending && (
                    <button
                      onClick={async () => {
                        try {
                          await updateBusinessAsync(biz.id, { isActive: true });
                          sendAccountApproved(biz.email, biz.businessName).catch(() => {});
                          toast.success(`${biz.businessName} אושר!`);
                          load();
                        } catch { toast.error('שגיאה'); }
                      }}
                      className="flex-1 py-1.5 rounded-[6px] text-[12px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#1db954,#00897b)' }}
                    >
                      אשר עסק
                    </button>
                  )}
                  <button onClick={() => handleQuickLogin(biz)} className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold" style={{ background: 'rgba(83,58,253,0.10)', color: '#533afd' }}>כניסה מהירה</button>
                  <button onClick={() => openEdit(biz)} className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold" style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}>עריכה</button>
                  <button onClick={() => biz.isBlocked ? handleUnblock(biz) : setBlockModal({ open: true, biz })}
                    className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold"
                    style={biz.isBlocked ? { background: 'rgba(29,185,84,0.10)', color: '#1db954' } : { background: 'rgba(234,34,97,0.10)', color: '#ea2261' }}>
                    {biz.isBlocked ? 'בטל חסימה' : 'חסום'}
                  </button>
                  <button onClick={() => setDeleteModal({ open: true, biz })} className="px-3 py-1.5 rounded-[6px] text-[12px]" style={{ background: 'rgba(156,163,175,0.12)', color: '#6b7280' }}>
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#c1cdd8' }}>
            <BuildingStorefrontIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-[13px] font-medium" style={{ color: '#8898aa' }}>לא נמצאו עסקים</p>
            <button
              onClick={() => { setAddForm(emptyBizForm()); setAddModal(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
            >
              <PlusIcon className="w-4 h-4" />
              הוסף עסק ראשון
            </button>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="הוסף עסק חדש" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleAdd} isLoading={isSaving}>שמור</Button>
          </>
        }
      >
        <form onSubmit={handleAdd}>
          <BizForm value={addForm} onChange={setAddForm} />
        </form>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, biz: null })} title={`עריכת עסק: ${editModal.biz?.businessName}`} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal({ open: false, biz: null })}>ביטול</Button>
            <Button variant="primary" onClick={handleEdit} isLoading={isSaving}>שמור שינויים</Button>
          </>
        }
      >
        <form onSubmit={handleEdit}>
          <BizForm value={editForm} onChange={setEditForm} editMode currentPasswordHash={editModal.biz?.password} />
        </form>
      </Modal>

      {/* ── DELETE MODAL ── */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, biz: null })} title="מחיקת עסק" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, biz: null })}>ביטול</Button>
            <Button variant="danger" onClick={handleDelete}>מחק</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">האם אתה בטוח שברצונך למחוק את העסק <strong>{deleteModal.biz?.businessName}</strong>? פעולה זו אינה ניתנת לביטול.</p>
      </Modal>

      {/* ── CREDENTIALS MODAL ── */}
      <Modal isOpen={credModal.open} onClose={() => setCredModal({ open: false, biz: null })} title={`פרטי גישה — ${credModal.biz?.businessName}`} size="sm">
        {credModal.biz && (
          <div className="space-y-4 text-right" dir="rtl">
            <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
              <p className="text-[11px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">אימייל</p>
              <p className="font-mono text-sm text-gray-800 select-all">{credModal.biz.email}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
              <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">סיסמה</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-gray-800 flex-1 select-all">
                  {showCredPw ? decodePassword(credModal.biz.password) : '••••••••••'}
                </p>
                <button type="button" onClick={() => setShowCredPw(!showCredPw)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0">
                  {showCredPw ? <EyeSlashIcon className="w-4 h-4 text-gray-500" /> : <EyeIcon className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 text-center">לשינוי פרטים — לחץ על כפתור העריכה</p>
          </div>
        )}
      </Modal>

      {/* ── BLOCK MODAL ── */}
      <Modal
        isOpen={blockModal.open}
        onClose={() => { setBlockModal({ open: false, biz: null }); setBlockReason(''); }}
        title={`חסימת עסק: ${blockModal.biz?.businessName}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setBlockModal({ open: false, biz: null }); setBlockReason(''); }}>ביטול</Button>
            <Button variant="danger" onClick={handleBlock}>אשר חסימה</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">האם אתה בטוח שברצונך לחסום את {blockModal.biz?.businessName}?</p>
          <Input label="סיבת החסימה (אופציונלי)" placeholder="לדוגמה: הפרת תנאי שימוש" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export default Businesses;
