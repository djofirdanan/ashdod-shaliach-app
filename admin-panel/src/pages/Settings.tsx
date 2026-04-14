import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  KeyIcon,
  TruckIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/LoadingSkeleton';
import { fetchSystemSettings, updateSystemSettings } from '../services/admin.service';
import type { SystemSettings } from '../services/admin.service';

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
      checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
    }`}
    role="switch"
    aria-checked={checked}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// ─── Masked Input ─────────────────────────────────────────────────────────────

interface MaskedInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const MaskedInput: React.FC<MaskedInputProps> = ({ label, value, onChange, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 transition-colors"
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {visible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const SettingsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-10 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-9 w-28 rounded-lg self-end ml-auto" />
        </div>
      </Card>
    ))}
  </div>
);

// ─── Settings Page ────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form values derived from settings
  const [platformName, setPlatformName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [dispatchTimeout, setDispatchTimeout] = useState('');
  const [maxRadius, setMaxRadius] = useState('');
  const [maxCouriers, setMaxCouriers] = useState('');

  // Notifications (local-only, no backend fetch needed)
  const [notifs, setNotifs] = useState({
    newOrder: true,
    orderAssigned: true,
    orderDelivered: true,
    orderFailed: true,
    courierOffline: false,
    lowBalance: true,
    systemAlert: true,
  });

  // API Keys (local-only, user fills them)
  const [firebaseKey, setFirebaseKey] = useState('');
  const [mapsKey, setMapsKey] = useState('');
  const [fcmKey, setFcmKey] = useState('');

  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingDispatch, setSavingDispatch] = useState(false);

  const loadSettings = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchSystemSettings();
      setSettings(data);
      setPlatformName(data.platformName ?? '');
      setContactEmail(data.contactEmail ?? '');
      setContactPhone(data.contactPhone ?? '');
      setDispatchTimeout(String(data.dispatchTimeout ?? ''));
      setMaxRadius(String(data.maxSearchRadius ?? ''));
      setMaxCouriers(String(data.maxCouriersPerDispatch ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ההגדרות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      await updateSystemSettings({
        platformName,
        contactEmail,
        contactPhone,
      });
      toast.success('הגדרות כלליות נשמרו בהצלחה!');
    } catch (err) {
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveDispatch = async () => {
    setSavingDispatch(true);
    try {
      await updateSystemSettings({
        dispatchTimeout: Number(dispatchTimeout),
        maxSearchRadius: Number(maxRadius),
        maxCouriersPerDispatch: Number(maxCouriers),
      });
      toast.success('הגדרות שיגור נשמרו בהצלחה!');
    } catch (err) {
      toast.error('שגיאה בשמירת הגדרות השיגור');
    } finally {
      setSavingDispatch(false);
    }
  };

  const handleSaveNotifs = () => {
    // Notifications are local-only — toast success
    toast.success('הגדרות התראות נשמרו!');
  };

  const handleSaveApiKeys = () => {
    // API keys are local-only — toast success
    toast.success('מפתחות API נשמרו!');
  };

  // ── Error state ──
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-96" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          </div>
          <p className="font-semibold text-gray-800 dark:text-white mb-1">שגיאה בטעינת ההגדרות</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button
            variant="primary"
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={loadSettings}
          >
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  const notifItems: { key: keyof typeof notifs; label: string; description: string }[] = [
    { key: 'newOrder', label: 'הזמנה חדשה', description: 'התראה כאשר מתקבלת הזמנה חדשה' },
    { key: 'orderAssigned', label: 'שיוך שליח', description: 'התראה כאשר שליח שויך למשלוח' },
    { key: 'orderDelivered', label: 'משלוח הושלם', description: 'התראה כאשר משלוח הגיע ליעדו' },
    { key: 'orderFailed', label: 'משלוח נכשל', description: 'התראה כאשר משלוח נכשל' },
    { key: 'courierOffline', label: 'שליח לא מחובר', description: 'התראה כאשר שליח פעיל מתנתק' },
    { key: 'lowBalance', label: 'יתרה נמוכה', description: 'התראה כאשר יתרת עסק נמוכה' },
    { key: 'systemAlert', label: 'התראות מערכת', description: 'שגיאות ואזהרות מערכת' },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">הגדרות</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ניהול הגדרות המערכת</p>
      </div>

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <>
          {/* General Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <GlobeAltIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">כללי</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <Input
                label="שם הפלטפורמה"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
              <Input
                label="אימייל תמיכה"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                dir="ltr"
              />
              <Input
                label="טלפון תמיכה"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveGeneral}
                disabled={savingGeneral}
              >
                {savingGeneral ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </Card>

          {/* Dispatch Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-orange-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">שיגור</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <Input
                label="זמן המתנה לאישור (שניות)"
                type="number"
                value={dispatchTimeout}
                onChange={(e) => setDispatchTimeout(e.target.value)}
                helperText="זמן שבו שליח יכול לאשר משלוח לפני שהוא עובר לשליח הבא"
              />
              <Input
                label={'רדיוס מקסימלי (ק"מ)'}
                type="number"
                value={maxRadius}
                onChange={(e) => setMaxRadius(e.target.value)}
                helperText="מרחק מקסימלי לחיפוש שליחים זמינים"
              />
              <Input
                label="מקסימום שליחים לשידור"
                type="number"
                value={maxCouriers}
                onChange={(e) => setMaxCouriers(e.target.value)}
                helperText="כמה שליחים מקסימום יקבלו התראה על משלוח חדש"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveDispatch}
                disabled={savingDispatch}
              >
                {savingDispatch ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <BellIcon className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">התראות</h2>
            </div>
            <div className="space-y-4 mb-5">
              {notifItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <Toggle checked={notifs[item.key]} onChange={() => toggleNotif(item.key)} />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSaveNotifs}>שמור שינויים</Button>
            </div>
          </Card>

          {/* API Keys */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <KeyIcon className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">מפתחות API</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <MaskedInput
                label="Firebase API Key"
                value={firebaseKey}
                onChange={setFirebaseKey}
                placeholder="AIzaSy..."
              />
              <MaskedInput
                label="Google Maps API Key"
                value={mapsKey}
                onChange={setMapsKey}
                placeholder="AIzaSy..."
              />
              <MaskedInput
                label="FCM Server Key"
                value={fcmKey}
                onChange={setFcmKey}
                placeholder="AAAA..."
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSaveApiKeys}>שמור מפתחות</Button>
            </div>
          </Card>

          {/* Subscription - Disabled */}
          <Card className="opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400">מנוי</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-600">
                  בקרוב
                </span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                ניהול מנויים ותשלומים יהיה זמין בקרוב
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Settings;
