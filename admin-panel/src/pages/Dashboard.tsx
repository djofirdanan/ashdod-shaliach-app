import React, { useState, useEffect } from 'react';
import {
  TruckIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { StatCard } from '../components/ui/StatCard';
import { RevenueChart } from '../components/charts/RevenueChart';
import { DeliveryChart } from '../components/charts/DeliveryChart';
import { CourierHeatmap } from '../components/charts/CourierHeatmap';
import { DeliveryStatusBadge } from '../components/deliveries/DeliveryStatusBadge';
import { Skeleton, TableSkeleton } from '../components/ui/LoadingSkeleton';
import { fetchDashboardStats } from '../services/admin.service';
import type { DashboardStats } from '../services/admin.service';
import { fetchActiveDeliveries } from '../services/delivery.service';
import type { Delivery, DailyRevenueData, HourlyDeliveryData } from '../types';
import { formatCurrency, formatTimeAgo } from '../utils/formatters';
import clsx from 'clsx';

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [weeklyData] = useState<DailyRevenueData[]>(generateWeeklyRevenue);
  const [hourlyData] = useState<HourlyDeliveryData[]>(generateHourlyDeliveries);

  const loadData = async () => {
    setError(null);
    try {
      const [statsData, deliveriesData] = await Promise.all([
        fetchDashboardStats(),
        fetchActiveDeliveries(),
      ]);
      setStats(statsData);
      setActiveDeliveries(deliveriesData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'אירעה שגיאה בלתי צפויה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} onRetry={() => { setLoading(true); loadData(); }} />;
  if (!stats) return null;

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
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-[13px] font-semibold text-white transition-all"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
              }}
            >
              <ArrowPathIcon className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              עדכן נתונים
            </button>
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

          {activeDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: '#c1cdd8' }}>
              <TruckIcon className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-[13px] font-medium" style={{ color: '#8898aa' }}>
                אין משלוחים פעילים כרגע
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {["מס' עקיבה", 'עסק', 'אזור', 'סטטוס', 'זמן'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-right"
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#8898aa',
                          borderBottom: '1px solid #e8ecf0',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeDeliveries.map((d, idx) => (
                    <tr
                      key={d.id}
                      className={clsx('transition-colors', idx % 2 !== 0 ? '' : '')}
                      style={{ borderBottom: '1px solid #f0f3f6' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className="font-mono text-[12px] font-bold px-2 py-0.5 rounded-[4px]"
                          style={{
                            color: '#533afd',
                            background: 'rgba(83,58,253,0.08)',
                            border: '1px solid rgba(83,58,253,0.15)',
                          }}
                        >
                          {d.trackingNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[13px] font-medium" style={{ color: '#3c4257' }}>
                          {d.business.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                          style={{
                            color: '#6b7c93',
                            background: '#f0f3f6',
                          }}
                        >
                          {d.zone}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <DeliveryStatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: '#8898aa' }}>
                          {formatTimeAgo(d.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
