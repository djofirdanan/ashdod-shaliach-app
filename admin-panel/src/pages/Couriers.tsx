import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  UserGroupIcon,
  StarIcon,
  TruckIcon,
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
  ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import * as storageService from '../services/storage.service';
import type { StoredCourier } from '../services/storage.service';
import { addCourierAsync, updateCourierAsync } from '../services/storage.service';
import { syncDown } from '../services/sync.service';
import { formatCurrency } from '../utils/formatters';
import { VEHICLE_TYPE_LABELS } from '../utils/constants';
import type { VehicleType } from '../types';
import { setUser, setPortalUser } from '../store/authSlice';
import { sendAccountApproved } from '../services/email.service';
import type { RootState } from '../store';
import { decodePassword } from '../services/storage.service';

const vehicleLabels: Record<VehicleType, string> = {
  motorcycle: VEHICLE_TYPE_LABELS.motorcycle,
  bicycle: VEHICLE_TYPE_LABELS.bicycle,
  car: VEHICLE_TYPE_LABELS.car,
  scooter: VEHICLE_TYPE_LABELS.scooter,
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-1">
    <StarSolid className="w-4 h-4 text-yellow-400" />
    <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
  </div>
);

// ─── Courier Form ─────────────────────────────────────────────
interface CourFormState {
  name: string;
  email: string;
  phone: string;
  vehicle: 'motorcycle' | 'bicycle' | 'car' | 'scooter';
  vehiclePlate: string;
  password: string;
  isActive: boolean;
}

const emptyCourForm = (): CourFormState => ({
  name: '', email: '', phone: '',
  vehicle: 'motorcycle', vehiclePlate: '', password: '', isActive: true,
});

interface CourFormProps {
  value: CourFormState;
  onChange: (v: CourFormState) => void;
  editMode?: boolean;
}

interface CourFormProps {
  value: CourFormState;
  onChange: (v: CourFormState) => void;
  editMode?: boolean;
  currentPasswordHash?: string;
}

const CourForm: React.FC<CourFormProps> = ({ value, onChange, editMode, currentPasswordHash }) => {
  const [showPw, setShowPw] = React.useState(false);
  const currentPw = currentPasswordHash ? decodePassword(currentPasswordHash) : '';
  return (
    <div className="space-y-4" dir="rtl">
      <Input label="שם מלא *" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="אימייל *" type="email" dir="ltr" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        <Input label="טלפון *" type="tel" dir="ltr" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#3c4257' }}>סוג רכב</label>
          <select value={value.vehicle}
            onChange={(e) => onChange({ ...value, vehicle: e.target.value as typeof value.vehicle })}
            className="w-full px-3 py-2.5 rounded-[6px] text-sm border outline-none"
            style={{ borderColor: '#e0e6ed', background: '#f8fafc', color: '#061b31', fontFamily: 'inherit' }}>
            <option value="motorcycle">אופנוע</option>
            <option value="bicycle">אופניים</option>
            <option value="car">רכב</option>
            <option value="scooter">קטנוע</option>
          </select>
        </div>
        {value.vehicle !== 'bicycle' && (
          <Input label="לוחית רישוי" dir="ltr" placeholder="12-345-67" value={value.vehiclePlate} onChange={(e) => onChange({ ...value, vehiclePlate: e.target.value })} />
        )}
      </div>

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

      <Input
        label={editMode ? 'סיסמה חדשה (ריק = ללא שינוי)' : 'סיסמה *'}
        type="password" dir="ltr" placeholder="••••••"
        value={value.password}
        onChange={(e) => onChange({ ...value, password: e.target.value })}
      />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ ...value, isActive: e.target.checked })} className="w-4 h-4 accent-purple-600" />
        <span className="text-sm font-medium text-gray-700">פעיל</span>
      </label>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const Couriers: React.FC = () => {
  const [couriers, setCouriers] = useState<StoredCourier[]>([]);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; courier: StoredCourier | null }>({ open: false, courier: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; courier: StoredCourier | null }>({ open: false, courier: null });
  const [blockModal, setBlockModal] = useState<{ open: boolean; courier: StoredCourier | null }>({ open: false, courier: null });
  const [blockReason, setBlockReason] = useState('');
  const [detailModal, setDetailModal] = useState<{ open: boolean; courier: StoredCourier | null }>({ open: false, courier: null });
  const [credModal, setCredModal] = useState<{ open: boolean; courier: StoredCourier | null }>({ open: false, courier: null });
  const [showCredPw, setShowCredPw] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState<CourFormState>(emptyCourForm());
  const [editForm, setEditForm] = useState<CourFormState>(emptyCourForm());

  const [isSaving, setIsSaving] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentAdminUser = useSelector((state: RootState) => state.auth.user);

  const load = useCallback(() => {
    setCouriers(storageService.getCouriers());
  }, []);

  useEffect(() => {
    // Sync from Supabase first so admin sees all registrations (including from other devices)
    syncDown().finally(load);
  }, [load]);

  const filtered = couriers.filter((c) => {
    const matchSearch = !search ||
      c.name.includes(search) ||
      c.email.includes(search) ||
      c.phone.includes(search);
    const matchVehicle = vehicleFilter === 'all' || c.vehicle === vehicleFilter;
    const matchStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'active' ? (c.isActive && !c.isBlocked)
      : statusFilter === 'pending' ? (!c.isActive && !c.isBlocked)
      : statusFilter === 'blocked' ? c.isBlocked
      : true;
    return matchSearch && matchVehicle && matchStatus;
  });

  const totalCount = couriers.length;
  const activeCount = couriers.filter((c) => c.isActive && !c.isBlocked).length;
  const avgRating = totalCount > 0 ? couriers.reduce((s, c) => s + c.rating, 0) / totalCount : 0;

  // ── Add ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.phone || !addForm.password) {
      toast.error('נא למלא את כל השדות החובה');
      return;
    }
    if (storageService.getCourierByEmail(addForm.email)) {
      toast.error('אימייל כבר קיים במערכת');
      return;
    }
    setIsSaving(true);
    try {
      await addCourierAsync({
        email: addForm.email,
        password: storageService.hashPassword(addForm.password),
        name: addForm.name,
        phone: addForm.phone,
        vehicle: addForm.vehicle,
        vehiclePlate: addForm.vehicle !== 'bicycle' ? addForm.vehiclePlate || undefined : undefined,
        isActive: addForm.isActive,
        isBlocked: false,
        rating: 5,
        totalDeliveries: 0,
        activeDeliveries: 0,
        earnings: { today: 0, thisWeek: 0, thisMonth: 0, total: 0 },
      });
      toast.success('שליח נוסף בהצלחה');
      setAddModal(false);
      setAddForm(emptyCourForm());
      load();
    } catch { toast.error('שגיאה בהוספת שליח'); }
    finally { setIsSaving(false); }
  };

  // ── Edit ──
  const openEdit = (courier: StoredCourier) => {
    setEditForm({
      name: courier.name,
      email: courier.email,
      phone: courier.phone,
      vehicle: courier.vehicle,
      vehiclePlate: courier.vehiclePlate || '',
      password: '',
      isActive: courier.isActive,
    });
    setEditModal({ open: true, courier });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.courier) return;
    setIsSaving(true);
    const wasInactive = !editModal.courier.isActive;
    const nowActive = editForm.isActive;
    try {
      const updateData: Partial<StoredCourier> = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        vehicle: editForm.vehicle,
        vehiclePlate: editForm.vehicle !== 'bicycle' ? editForm.vehiclePlate || undefined : undefined,
        isActive: editForm.isActive,
      };
      if (editForm.password.trim()) {
        updateData.password = storageService.hashPassword(editForm.password.trim());
      }
      await updateCourierAsync(editModal.courier.id, updateData);
      // Send approval email when admin activates a previously inactive courier
      if (wasInactive && nowActive) {
        sendAccountApproved(editForm.email, editForm.name).catch(() => {});
        toast.success('השליח אושר ומייל אישור נשלח!');
      } else {
        toast.success('שליח עודכן בהצלחה');
      }
      setEditModal({ open: false, courier: null });
      load();
    } catch { toast.error('שגיאה בעדכון שליח'); }
    finally { setIsSaving(false); }
  };

  // ── Delete ──
  const handleDelete = () => {
    if (!deleteModal.courier) return;
    storageService.deleteCourier(deleteModal.courier.id);
    toast.success('שליח נמחק');
    setDeleteModal({ open: false, courier: null });
    load();
  };

  // ── Block/Unblock ──
  const handleBlock = () => {
    if (!blockModal.courier) return;
    storageService.updateCourier(blockModal.courier.id, {
      isBlocked: true,
      blockedReason: blockReason || 'חסום על ידי מנהל',
    });
    toast.success(`שליח ${blockModal.courier.name} נחסם`);
    setBlockModal({ open: false, courier: null });
    setBlockReason('');
    load();
  };

  const handleUnblock = (courier: StoredCourier) => {
    storageService.updateCourier(courier.id, { isBlocked: false, blockedReason: undefined });
    toast.success(`חסימת ${courier.name} בוטלה`);
    load();
  };

  // ── Quick Login (Impersonation) ──
  const handleQuickLogin = (courier: StoredCourier) => {
    // Backup current admin session
    const currentToken = localStorage.getItem('admin_token');
    if (currentToken) localStorage.setItem('admin_token_backup', currentToken);
    if (currentAdminUser) localStorage.setItem('admin_user_backup', JSON.stringify(currentAdminUser));

    // Set courier token
    localStorage.setItem('admin_token', `courier-${courier.id}`);

    // Update Redux state to impersonate the courier
    dispatch(setUser({
      id: courier.id,
      name: courier.name,
      email: courier.email,
      role: 'admin',
      createdAt: courier.createdAt,
    }));
    dispatch(setPortalUser({ id: courier.id, type: 'courier', name: courier.name }));

    navigate('/');
    toast.success(`כניסה בשם: ${courier.name}`);
  };

  const pendingCount = couriers.filter((c) => !c.isActive && !c.isBlocked).length;
  const blockedCount = couriers.filter((c) => c.isBlocked).length;

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── HEADER ── */}
      <div
        className="rounded-[12px] p-5 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'linear-gradient(135deg, #061b31 0%, #1c1e54 60%, #533afd 100%)',
          boxShadow: '0 10px 30px rgba(28,30,84,0.25)',
        }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <UserGroupIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-[1.2rem] font-black text-white tracking-tight">ניהול שליחים</h1>
          </div>
          <p className="text-[13px] mr-10" style={{ color: 'rgba(255,255,255,0.50)' }}>
            {totalCount} שליחים רשומים · {activeCount} פעילים כעת
          </p>
        </div>
        <button
          onClick={() => { setAddForm(emptyCourForm()); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-bold text-white transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
        >
          <PlusIcon className="w-4 h-4" />
          הוסף שליח
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'סה"כ שליחים', value: totalCount, icon: <UserGroupIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#533afd,#3d22e0)', light: 'rgba(83,58,253,0.08)', color: '#533afd' },
          { label: 'פעילים', value: activeCount, icon: <TruckIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#1db954,#00897b)', light: 'rgba(29,185,84,0.08)', color: '#1db954' },
          { label: 'ממתינים לאישור', value: pendingCount, icon: <BoltIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#F97316,#ea580c)', light: 'rgba(249,115,22,0.08)', color: '#F97316' },
          { label: 'דירוג ממוצע', value: totalCount > 0 ? avgRating.toFixed(1) : '—', icon: <StarIcon className="w-5 h-5" />, bg: 'linear-gradient(135deg,#f59e0b,#d97706)', light: 'rgba(245,158,11,0.08)', color: '#f59e0b' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[10px] p-4 flex items-center gap-3"
            style={{ background: '#fff', border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(50,50,93,0.06)' }}
          >
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-black leading-none" style={{ color: '#061b31' }}>{s.value}</p>
              <p className="text-[11px] mt-0.5 leading-tight" style={{ color: '#8898aa' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── PENDING APPROVALS ALERT ── */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[8px]"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1.5px solid rgba(249,115,22,0.30)' }}
        >
          <BoltIcon className="w-4 h-4 flex-shrink-0" style={{ color: '#F97316' }} />
          <p className="text-[13px] font-semibold flex-1" style={{ color: '#92400e' }}>
            {pendingCount} שליח{pendingCount > 1 ? 'ים' : ''} ממתין{pendingCount > 1 ? 'ים' : ''} לאישור
            — <span className="font-normal">סנן לפי "ממתין לאישור" למטה</span>
          </p>
          <button
            onClick={() => setVehicleFilter('all')}
            className="text-[12px] font-bold px-3 py-1 rounded-full text-white flex-shrink-0"
            style={{ background: '#F97316' }}
          >
            הצג הכל
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
            onFocus={(e) => { e.currentTarget.style.borderColor = '#533afd'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(83,58,253,0.08)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e8ecf0'; e.currentTarget.style.boxShadow = ''; }}
          />
        </div>
        {/* Vehicle filter */}
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[7px] text-[13px] outline-none transition-all"
          style={{ background: '#f6f9fc', border: '1.5px solid #e8ecf0', color: '#061b31', fontFamily: 'inherit', direction: 'rtl' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#533afd'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#e8ecf0'; }}
        >
          <option value="all">כל הרכבים</option>
          <option value="motorcycle">אופנוע</option>
          <option value="car">רכב</option>
          <option value="scooter">קטנוע</option>
          <option value="bicycle">אופניים</option>
        </select>
        {/* Status filter */}
        <select
          value={statusFilter ?? 'all'}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-[7px] text-[13px] outline-none transition-all"
          style={{ background: '#f6f9fc', border: '1.5px solid #e8ecf0', color: '#061b31', fontFamily: 'inherit', direction: 'rtl' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#533afd'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#e8ecf0'; }}
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
                {['שם שליח', 'טלפון', 'רכב', 'דירוג', 'פעיל', 'סה"כ', 'הכנסות החודש', 'סטטוס', 'פעולות'].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-[11px] font-black uppercase tracking-wider" style={{ color: '#8898aa' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((courier) => {
                const isPending = !courier.isActive && !courier.isBlocked;
                return (
                  <tr
                    key={courier.id}
                    className="transition-colors cursor-pointer"
                    style={{
                      borderBottom: '1px solid #f6f9fc',
                      background: isPending ? 'rgba(249,115,22,0.03)' : 'transparent',
                      borderRight: isPending ? '3px solid #F97316' : '3px solid transparent',
                    }}
                    onClick={() => setDetailModal({ open: true, courier })}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isPending ? 'rgba(249,115,22,0.06)' : '#fafbff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isPending ? 'rgba(249,115,22,0.03)' : 'transparent'; }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[13px] font-black"
                          style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
                        >
                          {courier.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-[13px] block truncate" style={{ color: '#061b31' }}>{courier.name}</span>
                          {isPending && (
                            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: '#F97316' }}>
                              <ClockIcon className="w-3 h-3" /> ממתין לאישור
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: '#525f7f' }} dir="ltr">{courier.phone}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: '#525f7f' }}>{vehicleLabels[courier.vehicle] ?? courier.vehicle}</td>
                    <td className="px-4 py-3"><RatingStars rating={courier.rating} /></td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[13px] font-black"
                        style={{ color: courier.activeDeliveries > 0 ? '#2563EB' : '#c1cdd8' }}
                      >
                        {courier.activeDeliveries}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: '#525f7f' }}>{courier.totalDeliveries.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] font-bold" style={{ color: '#1db954' }}>{formatCurrency(courier.earnings.thisMonth)}</td>
                    <td className="px-4 py-3">
                      {courier.isBlocked
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(234,34,97,0.10)', color: '#ea2261' }}>⛔ חסום</span>
                        : courier.isActive
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(29,185,84,0.10)', color: '#1db954' }}>● פעיל</span>
                        : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>◐ ממתין</span>
                      }
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* Quick approve for pending */}
                        {isPending && (
                          <button
                            title="אשר שליח"
                            onClick={async () => {
                              try {
                                await updateCourierAsync(courier.id, { isActive: true });
                                sendAccountApproved(courier.email, courier.name).catch(() => {});
                                toast.success(`${courier.name} אושר!`);
                                load();
                              } catch { toast.error('שגיאה'); }
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-[6px] text-[11px] font-bold text-white transition-all"
                            style={{ background: 'linear-gradient(135deg,#1db954,#00897b)' }}
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            אשר
                          </button>
                        )}
                        <button title="פרטי גישה" onClick={() => { setShowCredPw(false); setCredModal({ open: true, courier }); }}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.20)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.10)'; }}>
                          <KeyIcon className="w-3.5 h-3.5" />
                        </button>
                        <button title="כניסה מהירה" onClick={() => handleQuickLogin(courier)}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(83,58,253,0.10)', color: '#533afd' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(83,58,253,0.20)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(83,58,253,0.10)'; }}>
                          <BoltIcon className="w-3.5 h-3.5" />
                        </button>
                        <button title="עריכה" onClick={() => openEdit(courier)}
                          className="p-1.5 rounded-[5px] transition-colors" style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.20)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.10)'; }}>
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => courier.isBlocked ? handleUnblock(courier) : setBlockModal({ open: true, courier })}
                          className="p-1.5 rounded-[5px] transition-colors"
                          style={courier.isBlocked
                            ? { background: 'rgba(29,185,84,0.10)', color: '#1db954' }
                            : { background: 'rgba(234,34,97,0.10)', color: '#ea2261' }
                          }
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                        >
                          {courier.isBlocked ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <NoSymbolIcon className="w-3.5 h-3.5" />}
                        </button>
                        <button title="מחיקה" onClick={() => setDeleteModal({ open: true, courier })}
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
          {filtered.map((courier) => {
            const isPending = !courier.isActive && !courier.isBlocked;
            return (
              <div
                key={courier.id}
                className="p-4 space-y-3"
                style={{
                  borderRight: isPending ? '3px solid #F97316' : '3px solid transparent',
                  background: isPending ? 'rgba(249,115,22,0.03)' : 'white',
                }}
                onClick={() => setDetailModal({ open: true, courier })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-black flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
                    >
                      {courier.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[14px]" style={{ color: '#061b31' }}>{courier.name}</p>
                      <p className="text-[11px]" style={{ color: '#8898aa' }} dir="ltr">{courier.phone}</p>
                    </div>
                  </div>
                  {courier.isBlocked
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(234,34,97,0.10)', color: '#ea2261' }}>חסום</span>
                    : courier.isActive
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(29,185,84,0.10)', color: '#1db954' }}>פעיל</span>
                    : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>ממתין</span>
                  }
                </div>
                <div className="flex items-center justify-between text-[12px]" style={{ color: '#8898aa' }}>
                  <span>{vehicleLabels[courier.vehicle]}</span>
                  <div className="flex items-center gap-2">
                    <RatingStars rating={courier.rating} />
                    <span>{formatCurrency(courier.earnings.thisMonth)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {isPending && (
                    <button
                      onClick={async () => {
                        try {
                          await updateCourierAsync(courier.id, { isActive: true });
                          sendAccountApproved(courier.email, courier.name).catch(() => {});
                          toast.success(`${courier.name} אושר!`);
                          load();
                        } catch { toast.error('שגיאה'); }
                      }}
                      className="flex-1 py-1.5 rounded-[6px] text-[12px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#1db954,#00897b)' }}
                    >
                      אשר שליח
                    </button>
                  )}
                  <button onClick={() => handleQuickLogin(courier)} className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold" style={{ background: 'rgba(83,58,253,0.10)', color: '#533afd' }}>כניסה מהירה</button>
                  <button onClick={() => openEdit(courier)} className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold" style={{ background: 'rgba(37,99,235,0.10)', color: '#2563EB' }}>עריכה</button>
                  <button onClick={() => courier.isBlocked ? handleUnblock(courier) : setBlockModal({ open: true, courier })}
                    className="flex-1 py-1.5 rounded-[6px] text-[12px] font-semibold"
                    style={courier.isBlocked ? { background: 'rgba(29,185,84,0.10)', color: '#1db954' } : { background: 'rgba(234,34,97,0.10)', color: '#ea2261' }}>
                    {courier.isBlocked ? 'בטל חסימה' : 'חסום'}
                  </button>
                  <button onClick={() => setDeleteModal({ open: true, courier })} className="px-3 py-1.5 rounded-[6px] text-[12px]" style={{ background: 'rgba(156,163,175,0.12)', color: '#6b7280' }}>
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#c1cdd8' }}>
            <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-[13px] font-medium" style={{ color: '#8898aa' }}>לא נמצאו שליחים</p>
            <button
              onClick={() => { setAddForm(emptyCourForm()); setAddModal(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
            >
              <PlusIcon className="w-4 h-4" />
              הוסף שליח ראשון
            </button>
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="הוסף שליח חדש" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleAdd} isLoading={isSaving}>שמור</Button>
          </>
        }
      >
        <form onSubmit={handleAdd}><CourForm value={addForm} onChange={setAddForm} /></form>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, courier: null })} title={`עריכת שליח: ${editModal.courier?.name}`} size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal({ open: false, courier: null })}>ביטול</Button>
            <Button variant="primary" onClick={handleEdit} isLoading={isSaving}>שמור שינויים</Button>
          </>
        }
      >
        <form onSubmit={handleEdit}><CourForm value={editForm} onChange={setEditForm} editMode currentPasswordHash={editModal.courier?.password} /></form>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal isOpen={detailModal.open} onClose={() => setDetailModal({ open: false, courier: null })} title="פרטי שליח" size="lg">
        {detailModal.courier && (
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-700 font-bold text-2xl">{detailModal.courier.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{detailModal.courier.name}</h3>
                <p className="text-gray-500" dir="ltr">{detailModal.courier.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'רכב', value: vehicleLabels[detailModal.courier.vehicle] },
                { label: 'דירוג', value: <RatingStars rating={detailModal.courier.rating} /> },
                { label: 'סה"כ משלוחים', value: detailModal.courier.totalDeliveries.toLocaleString() },
                { label: 'הצטרף', value: new Date(detailModal.courier.createdAt).toLocaleDateString('he-IL') },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <div className="font-semibold text-gray-900">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">רווחים</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: 'היום', value: detailModal.courier.earnings.today, color: 'text-green-600' },
                  { label: 'השבוע', value: detailModal.courier.earnings.thisWeek, color: 'text-blue-600' },
                  { label: 'החודש', value: detailModal.courier.earnings.thisMonth, color: 'text-purple-600' },
                  { label: 'סה"כ', value: detailModal.courier.earnings.total, color: 'text-gray-700' },
                ].map((e) => (
                  <div key={e.label}>
                    <p className={`text-lg font-bold ${e.color}`}>{formatCurrency(e.value)}</p>
                    <p className="text-xs text-gray-400">{e.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── CREDENTIALS MODAL ── */}
      <Modal isOpen={credModal.open} onClose={() => setCredModal({ open: false, courier: null })} title={`פרטי גישה — ${credModal.courier?.name}`} size="sm">
        {credModal.courier && (
          <div className="space-y-4 text-right" dir="rtl">
            <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
              <p className="text-[11px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">אימייל</p>
              <p className="font-mono text-sm text-gray-800 select-all">{credModal.courier.email}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e8ecf0' }}>
              <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">סיסמה</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm text-gray-800 flex-1 select-all">
                  {showCredPw ? decodePassword(credModal.courier.password) : '••••••••••'}
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

      {/* ── DELETE MODAL ── */}
      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, courier: null })} title="מחיקת שליח" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, courier: null })}>ביטול</Button>
            <Button variant="danger" onClick={handleDelete}>מחק</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">האם אתה בטוח שברצונך למחוק את השליח <strong>{deleteModal.courier?.name}</strong>?</p>
      </Modal>

      {/* ── BLOCK MODAL ── */}
      <Modal isOpen={blockModal.open} onClose={() => { setBlockModal({ open: false, courier: null }); setBlockReason(''); }}
        title={`חסימת שליח: ${blockModal.courier?.name}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setBlockModal({ open: false, courier: null }); setBlockReason(''); }}>ביטול</Button>
            <Button variant="danger" onClick={handleBlock}>אשר חסימה</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">האם אתה בטוח שברצונך לחסום את {blockModal.courier?.name}?</p>
          <Input label="סיבת החסימה (אופציונלי)" placeholder="לדוגמה: התנהגות לא הולמת" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};

export default Couriers;
