import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UserGroupIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RevenueChart } from '../components/charts/RevenueChart';
import { Skeleton, TableSkeleton } from '../components/ui/LoadingSkeleton';
import type { RevenueReport } from '../services/admin.service';
import * as storageService from '../services/storage.service';

function buildLocalReport(from: string, to: string): RevenueReport {
  const couriers = storageService.getCouriers();
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
  const dailyRevenue = Array.from({ length: Math.min(days, 7) }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return { date: d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' }), amount: 0 };
  });
  return {
    totalRevenue: 0,
    dailyRevenue,
    byZone: [],
    topCouriers: couriers.slice(0, 5).map((c) => ({ name: c.name, deliveries: c.totalDeliveries, earnings: c.earnings.total, rating: c.rating })),
  };
}

type TabType = 'revenue' | 'deliveries' | 'couriers';

// ─── Default date range: last 7 days ─────────────────────────────────────────

const getDefaultDates = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
};

// ─── CSV export (client-side from reportData) ─────────────────────────────────

const exportCSV = (data: RevenueReport, tab: TabType, from: string, to: string) => {
  let csv = '';
  if (tab === 'revenue') {
    csv = 'תאריך,הכנסות\n';
    csv += data.dailyRevenue.map((d) => `${d.date},${d.amount}`).join('\n');
  } else if (tab === 'deliveries') {
    csv = 'אזור,משלוחים,הכנסות\n';
    csv += data.byZone.map((z) => `${z.zone},${z.count},${z.revenue}`).join('\n');
  } else {
    csv = 'שם,משלוחים,רווחים,דירוג\n';
    csv += data.topCouriers
      .map((c) => `${c.name},${c.deliveries},${c.earnings},${c.rating}`)
      .join('\n');
  }
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `דוח_${tab}_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const ReportsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-56 rounded-xl" />
    <Card padding="none">
      <TableSkeleton rows={6} cols={4} />
    </Card>
  </div>
);

// ─── Reports Page ─────────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const defaults = getDefaultDates();
  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [reportData, setReportData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = (from: string, to: string) => {
    setLoading(true);
    setError(null);
    setReportData(buildLocalReport(from, to));
    setLoading(false);
  };

  useEffect(() => {
    loadReport(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (!reportData) return;
    exportCSV(reportData, activeTab, dateFrom, dateTo);
  };

  // Derived chart data: map dailyRevenue to shape for RevenueChart
  const revenueChartData = (reportData?.dailyRevenue ?? []).map((d) => ({
    date: d.date,
    revenue: d.amount,
    deliveries: 0, // not provided by this endpoint
  }));

  const totalRevenue = reportData?.totalRevenue ?? 0;
  const totalDeliveries = (reportData?.byZone ?? []).reduce((s, z) => s + z.count, 0);
  const avgPerDay =
    revenueChartData.length > 0
      ? Math.round(totalRevenue / revenueChartData.length)
      : 0;
  const topZone =
    (reportData?.byZone ?? []).length > 0
      ? (reportData!.byZone.reduce((a, b) => (a.revenue > b.revenue ? a : b)))
      : null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'revenue', label: 'הכנסות', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
    { id: 'deliveries', label: 'משלוחים', icon: <TruckIcon className="w-4 h-4" /> },
    { id: 'couriers', label: 'שליחים', icon: <UserGroupIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">דוחות</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ניתוח נתוני המערכת</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
          onClick={handleExportCSV}
          disabled={!reportData}
        >
          ייצוא CSV
        </Button>
      </div>

      {/* Date Range Picker */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">טווח תאריכים:</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">מ-</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">עד-</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>
          {loading && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              טוען...
            </span>
          )}
        </div>
      </Card>

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
            </div>
            <p className="font-semibold text-gray-800 dark:text-white mb-1">שגיאה בטעינת הנתונים</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button
              variant="primary"
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={() => loadReport(dateFrom, dateTo)}
            >
              נסה שוב
            </Button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && <ReportsSkeleton />}

      {/* Tabs + Content */}
      {!loading && !error && reportData && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">סה"כ הכנסות</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ₪{totalRevenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <ChartBarIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ממוצע יומי</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        ₪{avgPerDay.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <StarIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">אזור מוביל</p>
                      {topZone ? (
                        <>
                          <p className="text-base font-bold text-gray-900 dark:text-white">{topZone.zone}</p>
                          <p className="text-xs text-gray-400">₪{topZone.revenue.toLocaleString()}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Revenue Chart */}
              <Card>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  גרף הכנסות לפי יום
                </h3>
                {revenueChartData.length > 0 ? (
                  <RevenueChart data={revenueChartData} />
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    <p className="text-sm">אין נתונים לתצוגה</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Deliveries Tab */}
          {activeTab === 'deliveries' && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  משלוחים לפי אזור
                </h3>
              </div>
              {reportData.byZone.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <p className="text-sm">אין נתונים לתצוגה</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          {['#', 'אזור', 'משלוחים', 'הכנסות', 'אחוז'].map((h) => (
                            <th key={h} className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.byZone.map((row, idx) => {
                          const pct = totalDeliveries > 0 ? Math.round((row.count / totalDeliveries) * 100) : 0;
                          return (
                            <tr key={row.zone} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                              <td className="px-5 py-3 text-gray-400 text-xs">{idx + 1}</td>
                              <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{row.zone}</td>
                              <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{row.count}</td>
                              <td className="px-5 py-3 text-green-600 dark:text-green-400 font-medium">₪{row.revenue.toLocaleString()}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 w-20">
                                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {reportData.byZone.map((row, idx) => {
                      const pct = totalDeliveries > 0 ? Math.round((row.count / totalDeliveries) * 100) : 0;
                      return (
                        <div key={row.zone} className="px-4 py-3 flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-[13px]">{row.zone}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] text-gray-400 flex-shrink-0">{pct}%</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[12px] font-semibold text-gray-700">{row.count} משלוחים</p>
                            <p className="text-[11px] text-green-600 font-medium">₪{row.revenue.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Couriers Tab */}
          {activeTab === 'couriers' && (
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">דירוג שליחים</h3>
              </div>
              {reportData.topCouriers.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <p className="text-sm">אין נתונים לתצוגה</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          {['מקום', 'שם שליח', 'משלוחים', 'רווחים', 'דירוג'].map((h) => (
                            <th key={h} className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topCouriers.map((courier, idx) => (
                          <tr key={courier.name} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                            <td className="px-5 py-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold inline-flex ${
                                idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                              }`}>{idx + 1}</span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-purple-700 font-semibold text-xs">{courier.name.charAt(0)}</span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{courier.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">{courier.deliveries}</td>
                            <td className="px-5 py-3 text-green-600 dark:text-green-400 font-semibold">₪{courier.earnings.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1">
                                <StarSolid className="w-4 h-4 text-yellow-400" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">{courier.rating}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {reportData.topCouriers.map((courier, idx) => (
                      <div key={courier.name} className="px-4 py-3 flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                        }`}>{idx + 1}</span>
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-700 font-semibold text-sm">{courier.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-[13px] truncate">{courier.name}</p>
                          <p className="text-[11px] text-gray-500">{courier.deliveries} משלוחים</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[12px] font-semibold text-green-600">₪{courier.earnings.toLocaleString()}</p>
                          <div className="flex items-center gap-0.5 justify-end">
                            <StarSolid className="w-3 h-3 text-yellow-400" />
                            <span className="text-[11px] text-gray-500">{courier.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
