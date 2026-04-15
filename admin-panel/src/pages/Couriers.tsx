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
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
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
    return matchSearch && matchVehicle;
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
      toast.success('שליח נוסף בהצלחה ✅');
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
        toast.success('✅ השליח אושר ומייל אישור נשלח!');
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
    toast.success(`👤 כניסה בשם: ${courier.name}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול שליחים</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול וניטור כל השליחים במערכת</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="w-4 h-4" />}
          onClick={() => { setAddForm(emptyCourForm()); setAddModal(true); }}
        >
          הוסף שליח
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">סה"כ שליחים</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">פעילים כעת</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <StarIcon className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">דירוג ממוצע</p>
              <p className="text-2xl font-bold text-gray-900">{totalCount > 0 ? avgRating.toFixed(1) : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            />
          </div>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none"
          >
            <option value="all">כל הרכבים</option>
            <option value="motorcycle">אופנוע</option>
            <option value="car">רכב</option>
            <option value="scooter">קטנוע</option>
            <option value="bicycle">אופניים</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['שם', 'טלפון', 'רכב', 'דירוג', 'פעיל', 'סה"כ', 'הכנסות', 'סטטוס', 'פעולות'].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((courier) => (
                <tr
                  key={courier.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setDetailModal({ open: true, courier })}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-700 font-semibold text-xs">{courier.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-gray-900">{courier.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600" dir="ltr">{courier.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{vehicleLabels[courier.vehicle] ?? courier.vehicle}</td>
                  <td className="px-4 py-3"><RatingStars rating={courier.rating} /></td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${courier.activeDeliveries > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {courier.activeDeliveries}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{courier.totalDeliveries.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{formatCurrency(courier.earnings.thisMonth)}</td>
                  <td className="px-4 py-3">
                    {courier.isBlocked ? <Badge color="red" dot>חסום</Badge>
                      : courier.isActive ? <Badge color="green" dot>פעיל</Badge>
                      : <Badge color="gray" dot>לא זמין</Badge>}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button title="פרטי גישה" onClick={() => { setShowCredPw(false); setCredModal({ open: true, courier }); }}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">
                        <KeyIcon className="w-3.5 h-3.5" />
                      </button>
                      <button title="כניסה מהירה" onClick={() => handleQuickLogin(courier)}
                        className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100">
                        <BoltIcon className="w-3.5 h-3.5" />
                      </button>
                      <button title="עריכה" onClick={() => openEdit(courier)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => courier.isBlocked ? handleUnblock(courier) : setBlockModal({ open: true, courier })}
                        className={`p-1.5 rounded-lg ${courier.isBlocked ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                        {courier.isBlocked ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <NoSymbolIcon className="w-3.5 h-3.5" />}
                      </button>
                      <button title="מחיקה" onClick={() => setDeleteModal({ open: true, courier })}
                        className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-700">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.map((courier) => (
            <div key={courier.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-700 font-semibold">{courier.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{courier.name}</p>
                    <p className="text-xs text-gray-400" dir="ltr">{courier.phone}</p>
                  </div>
                </div>
                {courier.isBlocked ? <Badge color="red" dot>חסום</Badge>
                  : courier.isActive ? <Badge color="green" dot>פעיל</Badge>
                  : <Badge color="gray" dot>לא זמין</Badge>}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{vehicleLabels[courier.vehicle]}</span>
                <RatingStars rating={courier.rating} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => handleQuickLogin(courier)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700">כניסה מהירה</button>
                <button onClick={() => openEdit(courier)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">עריכה</button>
                <button onClick={() => courier.isBlocked ? handleUnblock(courier) : setBlockModal({ open: true, courier })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${courier.isBlocked ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {courier.isBlocked ? 'בטל' : 'חסום'}
                </button>
                <button onClick={() => setDeleteModal({ open: true, courier })} className="px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-600">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">לא נמצאו שליחים</p>
            <Button variant="primary" size="sm" className="mt-4" leftIcon={<PlusIcon className="w-4 h-4" />}
              onClick={() => { setAddForm(emptyCourForm()); setAddModal(true); }}>
              הוסף שליח ראשון
            </Button>
          </div>
        )}
      </Card>

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
            <p className="text-[11px] text-gray-400 text-center">לשינוי פרטים — לחץ על כפתור העריכה ✏️</p>
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
