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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import * as storageService from '../services/storage.service';
import type { StoredBusiness } from '../services/storage.service';
import { decodePassword } from '../services/storage.service';
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
      <div className="grid grid-cols-2 gap-3">
        <Input label="שם העסק *" value={value.businessName} onChange={(e) => onChange({ ...value, businessName: e.target.value })} />
        <Input label="איש קשר *" value={value.contactPerson} onChange={(e) => onChange({ ...value, contactPerson: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="אימייל *" type="email" dir="ltr" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        <Input label="טלפון *" type="tel" dir="ltr" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="רחוב *" value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} />
        <Input label="עיר" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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

  useEffect(() => { load(); }, [load]);

  const filtered = businesses.filter((b) => {
    const matchSearch = !search ||
      b.businessName.includes(search) ||
      b.email.includes(search) ||
      b.phone.includes(search);
    const matchCat = categoryFilter === 'all' || b.category === categoryFilter;
    return matchSearch && matchCat;
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
      storageService.addBusiness({
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
      storageService.updateBusiness(editModal.biz.id, updateData);
      // Send approval email when admin activates a previously inactive account
      if (wasInactive && nowActive) {
        sendAccountApproved(editForm.email, editForm.businessName).catch(() => {});
        toast.success('✅ העסק אושר ומייל אישור נשלח!');
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
    toast.success(`👤 כניסה בשם: ${biz.businessName}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול עסקים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ניהול כל העסקים הרשומים במערכת</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<PlusIcon className="w-4 h-4" />}
          onClick={() => { setAddForm(emptyBizForm()); setAddModal(true); }}
        >
          הוסף עסק
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">סה"כ עסקים</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <BuildingStorefrontIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">עסקים פעילים</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">סה"כ משלוחים</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDeliveries.toLocaleString()}</p>
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'all' ? 'כל הקטגוריות' : cat}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table / Cards */}
      <Card padding="none">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['שם עסק', 'טלפון', 'קטגוריה', 'משלוחים', 'דירוג', 'יתרה', 'סטטוס', 'פעולות'].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((biz) => (
                <tr key={biz.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <BuildingStorefrontIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{biz.businessName}</p>
                        <p className="text-xs text-gray-400">{biz.contactPerson}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600" dir="ltr">{biz.phone}</td>
                  <td className="px-4 py-3">
                    <Badge color={(categoryColors[biz.category] as any) || 'gray'} size="sm">{biz.category}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{biz.totalDeliveries.toLocaleString()}</td>
                  <td className="px-4 py-3"><RatingStars rating={biz.rating} /></td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(biz.balance)}</td>
                  <td className="px-4 py-3">
                    {biz.isBlocked ? <Badge color="red" dot>חסום</Badge>
                      : biz.isActive ? <Badge color="green" dot>פעיל</Badge>
                      : <Badge color="gray" dot>לא פעיל</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Credentials */}
                      <button title="פרטי גישה" onClick={() => { setShowCredPw(false); setCredModal({ open: true, biz }); }}
                        className="p-1.5 rounded-lg text-xs font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100">
                        <KeyIcon className="w-3.5 h-3.5" />
                      </button>
                      {/* Quick Login */}
                      <button title="כניסה מהירה" onClick={() => handleQuickLogin(biz)}
                        className="p-1.5 rounded-lg text-xs font-medium transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100">
                        <BoltIcon className="w-3.5 h-3.5" />
                      </button>
                      {/* Edit */}
                      <button title="עריכה" onClick={() => openEdit(biz)}
                        className="p-1.5 rounded-lg text-xs font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      {/* Block/Unblock */}
                      <button onClick={() => biz.isBlocked ? handleUnblock(biz) : setBlockModal({ open: true, biz })}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${biz.isBlocked ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                        {biz.isBlocked ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <NoSymbolIcon className="w-3.5 h-3.5" />}
                      </button>
                      {/* Delete */}
                      <button title="מחיקה" onClick={() => setDeleteModal({ open: true, biz })}
                        className="p-1.5 rounded-lg text-xs font-medium transition-colors bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-700">
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
          {filtered.map((biz) => (
            <div key={biz.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{biz.businessName}</p>
                    <p className="text-xs text-gray-400">{biz.contactPerson}</p>
                  </div>
                </div>
                {biz.isBlocked ? <Badge color="red" dot>חסום</Badge>
                  : biz.isActive ? <Badge color="green" dot>פעיל</Badge>
                  : <Badge color="gray" dot>לא פעיל</Badge>}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span dir="ltr">{biz.phone}</span>
                <Badge color={(categoryColors[biz.category] as any) || 'gray'} size="sm">{biz.category}</Badge>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => handleQuickLogin(biz)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700">
                  כניסה מהירה
                </button>
                <button onClick={() => openEdit(biz)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                  עריכה
                </button>
                <button onClick={() => biz.isBlocked ? handleUnblock(biz) : setBlockModal({ open: true, biz })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${biz.isBlocked ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {biz.isBlocked ? 'בטל חסימה' : 'חסום'}
                </button>
                <button onClick={() => setDeleteModal({ open: true, biz })} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BuildingStorefrontIcon className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">לא נמצאו עסקים</p>
            <Button variant="primary" size="sm" className="mt-4" leftIcon={<PlusIcon className="w-4 h-4" />}
              onClick={() => { setAddForm(emptyBizForm()); setAddModal(true); }}>
              הוסף עסק ראשון
            </Button>
          </div>
        )}
      </Card>

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
            <p className="text-[11px] text-gray-400 text-center">לשינוי פרטים — לחץ על כפתור העריכה ✏️</p>
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
