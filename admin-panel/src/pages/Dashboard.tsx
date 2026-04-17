import React, { useState, useEffect, useCallback } from 'react';
import {
  TruckIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { Flask, Rocket, Package, Money, DeviceMobile } from '@phosphor-icons/react';
import { StatCard } from '../components/ui/StatCard';
import { RevenueChart } from '../components/charts/RevenueChart';
import { DeliveryChart } from '../components/charts/DeliveryChart';
import { CourierHeatmap } from '../components/charts/CourierHeatmap';
import { Skeleton, TableSkeleton } from '../components/ui/LoadingSkeleton';
import type { DailyRevenueData, HourlyDeliveryData } from '../types';
import { formatCurrency } from '../utils/formatters';
import * as storageService from '../services/storage.service';
import { addDeliveryNotification, updateCourierAsync, updateBusinessAsync } from '../services/storage.service';
import { sendAccountApproved } from '../services/email.service';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface DashboardStats {
  deliveriesToday: number;
  activeDeliveries: number;
  activeCouriers: number;
  totalCouriers: number;
  totalBusinesses: number;
  activeBusinesses: number;
  revenueToday: number;
  revenueThisWeek: number;
  trends: { deliveries: number; couriers: number; businesses: number; revenue: number };
}

interface PendingItem {
  id: string;
  name: string;
  type: 'courier' | 'business';
  email: string;
  phone: string;
  createdAt: string;
  extra?: string; // vehicle for courier, category for business
}

function buildStatsFromStorage(): DashboardStats {
  const couriers = storageService.getCouriers();
  const businesses = storageService.getBusinesses();
  const activeCouriers = couriers.filter((c) => c.isActive && !c.isBlocked).length;
  const activeBusinesses = businesses.filter((b) => b.isActive && !b.isBlocked).length;
  const revenueToday = couriers.reduce((s, c) => s + c.earnings.today, 0);
  const revenueThisWeek = couriers.reduce((s, c) => s + c.earnings.thisWeek, 0);
  return {
    deliveriesToday: 0,
    activeDeliveries: 0,
    activeCouriers,
    totalCouriers: couriers.length,
    totalBusinesses: businesses.length,
    activeBusinesses,
    revenueToday,
    revenueThisWeek,
    trends: { deliveries: 0, couriers: 0, businesses: businesses.length, revenue: 0 },
  };
}

// ─── Static chart data ────────────────────────────────────────────────────────
const generateWeeklyRevenue = (): DailyRevenueData[] => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days.map((date) => ({
    date,
    revenue: 1200 + Math.random() * 2800,
    deliveries: 20 + Math.floor(Math.random() * 60),
  }));
};

const generateHourlyDeliveries = (): HourlyDeliveryData[] =>
  Array.from({ length: 16 }, (_, i) => ({
    hour: `${(i + 7).toString().padStart(2, '0')}:00`,
    deliveries:
      i >= 4 && i <= 7 ? 8 + Math.floor(Math.random() * 12) : Math.floor(Math.random() * 8),
    revenue: (i >= 4 && i <= 7 ? 200 : 50) + Math.random() * 150,
  }));


// ─── Loading ──────────────────────────────────────────────────────────────────
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-5">
    <Skeleton className="h-[110px] rounded-[8px]" />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[130px] rounded-[12px]" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <Skeleton className="lg:col-span-3 h-64 rounded-[8px]" />
      <Skeleton className="lg:col-span-2 h-64 rounded-[8px]" />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
      <div
        className="xl:col-span-3 bg-white rounded-[8px] p-5"
        style={{ border: '1px solid #e8ecf0' }}
      >
        <TableSkeleton rows={6} cols={5} />
      </div>
      <div className="xl:col-span-2 flex flex-col gap-4">
        <Skeleton className="h-48 rounded-[8px]" />
        <Skeleton className="h-48 rounded-[8px]" />
      </div>
    </div>
  </div>
);

// ─── Error ────────────────────────────────────────────────────────────────────
const DashboardError: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex items-center justify-center min-h-96">
    <div
      className="bg-white rounded-[12px] p-10 text-center max-w-md w-full"
      style={{
        boxShadow: '0 13px 27px -5px rgba(234,34,97,0.15), 0 8px 16px -8px rgba(234,34,97,0.10)',
        border: '1px solid rgba(234,34,97,0.18)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(234,34,97,0.08)' }}
      >
        <ExclamationTriangleIcon className="w-7 h-7" style={{ color: '#ea2261' }} />
      </div>
      <h3 className="text-[16px] font-bold mb-2" style={{ color: '#061b31' }}>
        שגיאה בטעינת הנתונים
      </h3>
      <p className="text-[13px] mb-6" style={{ color: '#8898aa' }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-sm font-semibold text-white transition-all"
        style={{
          background: 'linear-gradient(135deg, #533afd, #3d22e0)',
          boxShadow: '0 4px 6px rgba(50,50,93,0.11)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 7px 14px rgba(50,50,93,0.15)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 4px 6px rgba(50,50,93,0.11)';
          (e.currentTarget as HTMLButtonElement).style.transform = '';
        }}
      >
        <ArrowPathIcon className="w-4 h-4" />
        נסה שוב
      </button>
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(() => buildStatsFromStorage());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  const [weeklyData] = useState<DailyRevenueData[]>(generateWeeklyRevenue);
  const [hourlyData] = useState<HourlyDeliveryData[]>(generateHourlyDeliveries);

  // Test notification modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPickup, setTestPickup] = useState('');
  const [testDrop, setTestDrop] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testPrice, setTestPrice] = useState('35');
  const [testVehicle, setTestVehicle] = useState('');
  const [testPayment, setTestPayment] = useState<'cash'|'bit'>('cash');

  const VEHICLE_LABELS: Record<string, string> = {
    motorcycle: 'אופנוע', bicycle: 'אופניים', car: 'רכב', scooter: 'קטנוע',
  };

  const loadPending = useCallback(() => {
    const couriers = storageService.getCouriers()
      .filter((c) => !c.isActive && !c.isBlocked)
      .map((c): PendingItem => ({
        id: c.id, name: c.name, type: 'courier',
        email: c.email, phone: c.phone, createdAt: c.createdAt,
        extra: VEHICLE_LABELS[c.vehicle] ?? c.vehicle,
      }));
    const businesses = storageService.getBusinesses()
      .filter((b) => !b.isActive && !b.isBlocked)
      .map((b): PendingItem => ({
        id: b.id, name: b.businessName, type: 'business',
        email: b.email, phone: b.phone, createdAt: b.createdAt,
        extra: b.category,
      }));
    setPendingItems([...couriers, ...businesses].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (item: PendingItem) => {
    try {
      if (item.type === 'courier') {
        await updateCourierAsync(item.id, { isActive: true });
      } else {
        await updateBusinessAsync(item.id, { isActive: true });
      }
      sendAccountApproved(item.email, item.name).catch(() => {});
      toast.success(`${item.name} אושר בהצלחה!`);
      loadPending();
      loadData();
    } catch {
      toast.error('שגיאה באישור');
    }
  };

  const handleRejectPending = async (item: PendingItem) => {
    try {
      if (item.type === 'courier') {
        storageService.updateCourier(item.id, { isBlocked: true, blockedReason: 'נדחה על ידי מנהל' });
      } else {
        storageService.updateBusiness(item.id, { isBlocked: true, blockedReason: 'נדחה על ידי מנהל' });
      }
      toast.success(`${item.name} נדחה`);
      loadPending();
    } catch {
      toast.error('שגיאה');
    }
  };

  const loadData = () => {
    setStats(buildStatsFromStorage());
    setLastUpdated(new Date());
    loadPending();
  };

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-5 fade-in">

      {/* ── TOP BANNER ──────────────────────────────────────────────────────── */}
      <div
        className="rounded-[12px] p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #061b31 0%, #1c1e54 55%, #533afd 100%)',
          boxShadow: '0 13px 27px -5px rgba(28,30,84,0.35), 0 8px 16px -8px rgba(28,30,84,0.20)',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: '-40px', left: '-40px',
            width: '200px', height: '200px',
            background: 'rgba(83,58,253,0.15)',
          }}
        />
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            bottom: '-30px', right: '-30px',
            width: '150px', height: '150px',
            background: 'rgba(234,34,97,0.10)',
          }}
        />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Greeting */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
              style={{
                background: 'rgba(83,58,253,0.25)',
                border: '1px solid rgba(83,58,253,0.40)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#533afd' }}
              />
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {stats.activeDeliveries} משלוחים פעילים
              </span>
            </div>
            <h2 className="text-white text-[1.4rem] font-black leading-tight tracking-tight mb-2">
              ברוך הבא, מנהל מערכת
            </h2>
            <p className="text-[13px] mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
              הנה סיכום הפעילות של היום — הכל תחת שליטה
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-semibold text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
              >
                <ArrowPathIcon className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                עדכן נתונים
              </button>
              {/* Test notification button — opens modal */}
              <button
                onClick={() => setShowTestModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-bold text-white transition-all"
                style={{ background: 'rgba(234,34,97,0.35)', border: '1px solid rgba(234,34,97,0.5)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,34,97,0.5)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(234,34,97,0.35)'; }}
              >
                <Flask size={14} /> שלח התראת בדיקה לשליחים
              </button>
            </div>
          </div>

          {/* Clock */}
          <div
            className="rounded-[10px] px-5 py-4 flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="text-left" dir="ltr">
              <p
                className="text-[1.75rem] font-black leading-none tracking-tight text-white"
                id="live-clock"
              >
                <_LiveTimeString />
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <_LiveDateString />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="משלוחים היום"
          value={stats.deliveriesToday}
          subtitle={`${stats.activeDeliveries} פעילים כרגע`}
          icon={<TruckIcon className="w-5 h-5" />}
          color="purple"
          trend={{ value: stats.trends.deliveries, label: 'לעומת אתמול' }}
        />
        <StatCard
          title="שליחים פעילים"
          value={stats.activeCouriers}
          subtitle={`מתוך ${stats.totalCouriers} רשומים`}
          icon={<UserGroupIcon className="w-5 h-5" />}
          color="ruby"
          trend={{ value: stats.trends.couriers, label: 'לעומת אמש' }}
        />
        <StatCard
          title="עסקים רשומים"
          value={stats.totalBusinesses}
          subtitle={`${stats.activeBusinesses} פעילים`}
          icon={<BuildingStorefrontIcon className="w-5 h-5" />}
          color="teal"
          trend={{ value: stats.trends.businesses, label: 'חדשים השבוע' }}
        />
        <StatCard
          title="הכנסות היום"
          value={formatCurrency(stats.revenueToday)}
          subtitle={`השבוע: ${formatCurrency(stats.revenueThisWeek)}`}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          color="gold"
          trend={{ value: stats.trends.revenue, label: 'לעומת אתמול' }}
        />
      </div>

      {/* ── PENDING APPROVALS ─────────────────────────────────────────────── */}
      {pendingItems.length > 0 && (
        <div
          className="rounded-[12px] overflow-hidden"
          style={{
            border: '1.5px solid rgba(249,115,22,0.35)',
            boxShadow: '0 4px 20px rgba(249,115,22,0.10)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: 'rgba(249,115,22,0.08)', borderBottom: '1px solid rgba(249,115,22,0.20)' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(249,115,22,0.15)' }}
              >
                <BellAlertIcon className="w-4 h-4" style={{ color: '#F97316' }} />
              </span>
              <div>
                <h3 className="text-[14px] font-bold" style={{ color: '#92400e' }}>
                  ממתינים לאישור
                </h3>
                <p className="text-[11px]" style={{ color: '#b45309' }}>
                  {pendingItems.length} {pendingItems.length === 1 ? 'בקשה' : 'בקשות'} חדשות מחכות לאישורך
                </p>
              </div>
            </div>
            <span
              className="px-2.5 py-1 rounded-full text-[12px] font-black text-white"
              style={{ background: '#F97316' }}
            >
              {pendingItems.length}
            </span>
          </div>

          {/* List */}
          <div className="bg-white divide-y divide-orange-50">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors"
                style={{ background: 'rgba(255,251,247,0.8)' }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-black"
                  style={{
                    background: item.type === 'courier'
                      ? 'linear-gradient(135deg, #533afd, #3d22e0)'
                      : 'linear-gradient(135deg, #F97316, #ea580c)',
                  }}
                >
                  {item.name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold truncate" style={{ color: '#061b31' }}>
                      {item.name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: item.type === 'courier' ? 'rgba(83,58,253,0.10)' : 'rgba(249,115,22,0.10)',
                        color: item.type === 'courier' ? '#533afd' : '#ea580c',
                      }}
                    >
                      {item.type === 'courier' ? 'שליח' : 'עסק'}
                      {item.extra ? ` · ${item.extra}` : ''}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8898aa' }} dir="ltr">
                    {item.phone} · {item.email}
                  </p>
                </div>

                {/* Joined time */}
                <span className="text-[11px] flex-shrink-0 hidden sm:block" style={{ color: '#c1cdd8' }}>
                  {new Date(item.createdAt).toLocaleDateString('he-IL')}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-bold text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #1db954, #00897b)' }}
                    title="אשר"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">אשר</span>
                  </button>
                  <button
                    onClick={() => handleRejectPending(item)}
                    className="p-1.5 rounded-[6px] transition-all active:scale-95"
                    style={{ background: 'rgba(234,34,97,0.08)', color: '#ea2261' }}
                    title="דחה"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHARTS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Revenue */}
        <div
          className="lg:col-span-3 bg-white rounded-[8px] p-5"
          style={{
            border: '1px solid #e8ecf0',
            boxShadow: '0 2px 5px rgba(50,50,93,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-[14px] tracking-tight" style={{ color: '#061b31' }}>
                הכנסות שבועיות
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#8898aa' }}>ביצועים לפי יום</p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-[12px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #533afd, #3d22e0)' }}
            >
              {formatCurrency(stats.revenueThisWeek)}
            </span>
          </div>
          <RevenueChart data={weeklyData} />
        </div>

        {/* Hourly */}
        <div
          className="lg:col-span-2 bg-white rounded-[8px] p-5"
          style={{
            border: '1px solid #e8ecf0',
            boxShadow: '0 2px 5px rgba(50,50,93,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-[14px] tracking-tight" style={{ color: '#061b31' }}>
                משלוחים לפי שעה
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#8898aa' }}>התפלגות היום</p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-[12px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #ea2261, #c01053)' }}
            >
              {stats.deliveriesToday} משלוחים
            </span>
          </div>
          <DeliveryChart data={hourlyData} />
        </div>
      </div>

      {/* ── BOTTOM ROW ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Active deliveries table */}
        <div
          className="xl:col-span-3 bg-white rounded-[8px] overflow-hidden"
          style={{
            border: '1px solid #e8ecf0',
            boxShadow: '0 2px 5px rgba(50,50,93,0.08)',
          }}
        >
          {/* Table header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #e8ecf0' }}
          >
            <div>
              <h2 className="font-bold text-[14px] tracking-tight" style={{ color: '#061b31' }}>
                משלוחים פעילים
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#8898aa' }}>מעקב בזמן אמת</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#1db954' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: '#1db954' }}
                />
              </span>
              <span
                className="text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg, #1db954, #00897b)' }}
              >
                {stats.activeDeliveries} פעילים
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-16" style={{ color: '#c1cdd8' }}>
            <TruckIcon className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-[13px] font-medium" style={{ color: '#8898aa' }}>
              אין משלוחים פעילים כרגע
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#c1cdd8' }}>
              משלוחים יופיעו כאן בזמן אמת
            </p>
          </div>
        </div>

        {/* Heatmap */}
        <div className="xl:col-span-2">
          <div
            className="bg-white rounded-[8px] p-5 h-full"
            style={{
              border: '1px solid #e8ecf0',
              boxShadow: '0 2px 5px rgba(50,50,93,0.08)',
            }}
          >
            <h2 className="font-bold text-[14px] tracking-tight mb-0.5" style={{ color: '#061b31' }}>
              מפת פעילות שליחים
            </h2>
            <p className="text-[12px] mb-4" style={{ color: '#8898aa' }}>
              פעילות לפי שעה ויום
            </p>
            <CourierHeatmap />
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-center pb-2" style={{ color: '#c1cdd8' }}>
        עודכן לאחרונה: {lastUpdated.toLocaleTimeString('he-IL')} · מתרענן כל 30 שניות
      </p>

      {/* ── Test notification modal ── */}
      {showTestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowTestModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[17px] font-black flex items-center gap-1" style={{ color: '#061b31' }}><Flask size={16} /> שליחת התראת בדיקה</h2>
              <button onClick={() => setShowTestModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            {[
              { label: 'כתובת איסוף', val: testPickup, set: setTestPickup, ph: 'למשל: רוטשילד 12, אשדוד' },
              { label: 'כתובת מסירה', val: testDrop, set: setTestDrop, ph: 'למשל: הרצל 45, אשדוד' },
              { label: 'הערה / תיאור', val: testDesc, set: setTestDesc, ph: 'פרטים על המשלוח...' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="text-[11px] font-bold block mb-1" style={{ color: '#8898aa' }}>{label}</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', direction: 'rtl', color: '#061b31' }}
                  placeholder={ph}
                  value={val}
                  onChange={e => set(e.target.value)}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: '#8898aa' }}>מחיר לשליח (₪)</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', direction: 'ltr', color: '#061b31' }}
                  type="number" min="0"
                  value={testPrice}
                  onChange={e => setTestPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: '#8898aa' }}>כלי רכב</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: '#f6f9fc', border: '1px solid #e8ecf0', direction: 'rtl', color: '#061b31' }}
                  value={testVehicle}
                  onChange={e => setTestVehicle(e.target.value)}
                >
                  <option value="">כל כלי רכב</option>
                  <option value="motorcycle">אופנוע</option>
                  <option value="scooter">קטנוע</option>
                  <option value="bicycle">אופניים</option>
                  <option value="car">רכב</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: '#8898aa' }}>אופן תשלום</label>
              <div className="flex gap-2">
                {(['cash', 'bit'] as const).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setTestPayment(pm)}
                    className="flex-1 py-2 rounded-xl font-bold text-[13px] transition-all"
                    style={{
                      background: testPayment === pm ? '#eef2ff' : '#f6f9fc',
                      border: `1.5px solid ${testPayment === pm ? '#533afd' : '#e8ecf0'}`,
                      color: testPayment === pm ? '#533afd' : '#8898aa',
                    }}
                  >
                    {pm === 'cash' ? <><Money size={13} /> מזומן</> : <><DeviceMobile size={13} /> ביט</>}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const businesses = storageService.getBusinesses();
                const biz = businesses[0];
                addDeliveryNotification({
                  businessId: biz?.id || 'admin-test',
                  businessName: biz?.businessName || 'ניהול מערכת',
                  pickupAddress: testPickup.trim() || 'כתובת איסוף לבדיקה',
                  dropAddress: testDrop.trim() || 'כתובת מסירה לבדיקה',
                  description: testDesc.trim() || undefined,
                  price: parseFloat(testPrice) || 35,
                  requiredVehicle: testVehicle || undefined,
                  paymentMethod: testPayment,
                });
                toast.success('התראת בדיקה נשלחה לשליחים!');
                setShowTestModal(false);
                setTestPickup(''); setTestDrop(''); setTestDesc(''); setTestPrice('35'); setTestVehicle('');
              }}
              className="w-full py-3 rounded-xl text-white font-black text-[14px] transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ea2261, #533afd)' }}
            >
              <span className="flex items-center justify-center gap-1.5"><Rocket size={15} /> שלח התראה לשליחים</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Tiny sub-components for the clock in the hero banner
const _LiveTimeString: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      {now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </>
  );
};

const _LiveDateString: React.FC = () => {
  const [now] = useState(new Date());
  return (
    <>
      {now.toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    </>
  );
};


export default Dashboard;
