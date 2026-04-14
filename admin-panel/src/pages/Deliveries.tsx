import React, { useState, useEffect, useRef } from 'react';
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { DeliveryList } from '../components/deliveries/DeliveryList';
import { DeliveryDetails } from '../components/deliveries/DeliveryDetails';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import type { Delivery, DeliveryStatus } from '../types';
import { DELIVERY_STATUS_LABELS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import {
  fetchDeliveries,
  updateDeliveryStatus,
  exportDeliveriesToCsv,
} from '../services/delivery.service';
import type { DeliveryFilters } from '../services/delivery.service';

const PAGE_SIZE = 25;

const statusOptions = [
  { value: 'all', label: 'כל הסטטוסים' },
  ...Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const Deliveries: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Selected delivery for modal
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [exporting, setExporting] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildFilters = (searchVal: string, pg: number): DeliveryFilters => ({
    status: statusFilter !== 'all' ? (statusFilter as DeliveryStatus) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: searchVal || undefined,
    page: pg,
    limit: PAGE_SIZE,
  });

  const loadDeliveries = async (searchVal: string, pg: number) => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchDeliveries(buildFilters(searchVal, pg));
      setDeliveries(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת המשלוחים');
    } finally {
      setLoading(false);
    }
  };

  // Load when page or filter inputs (except search) change
  useEffect(() => {
    loadDeliveries(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, dateFrom, dateTo]);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      loadDeliveries(search, 1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRowClick = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, status: DeliveryStatus) => {
    try {
      const updated = await updateDeliveryStatus(id, status);
      setDeliveries((prev) => prev.map((d) => (d.id === id ? updated : d)));
      if (selectedDelivery?.id === id) {
        setSelectedDelivery(updated);
      }
      toast.success('סטטוס המשלוח עודכן');
    } catch (err) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await exportDeliveriesToCsv(buildFilters(search, page));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deliveries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('הקובץ יוצא בהצלחה');
    } catch (err) {
      toast.error('שגיאה בייצוא הקובץ');
    } finally {
      setExporting(false);
    }
  };

  // Summary stats from current page
  const delivered = deliveries.filter((d) => d.status === 'delivered').length;
  const pending = deliveries.filter((d) => d.status === 'pending').length;
  const pageRevenue = deliveries
    .filter((d) => d.status === 'delivered')
    .reduce((s, d) => s + d.price, 0);

  return (
    <div className="space-y-5">
      {/* Top stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'סה"כ תוצאות', value: total.toLocaleString(), color: 'text-[#6C63FF]' },
          { label: 'הושלמו (עמוד)', value: delivered, color: 'text-green-600' },
          { label: 'ממתינים (עמוד)', value: pending, color: 'text-orange-500' },
          { label: 'הכנסות (עמוד)', value: formatCurrency(pageRevenue), color: 'text-[#6C63FF]' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#1E1F33] rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="חפש מספר עקיבה, עסק, לקוח..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:border-[#6C63FF] transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="w-44">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            />
          </div>

          {/* Date from */}
          <div className="w-36">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:border-[#6C63FF] transition-all"
            />
          </div>

          {/* Date to */}
          <div className="w-36">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30 focus:border-[#6C63FF] transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={() => loadDeliveries(search, page)}
            >
              רענן
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={
                exporting
                  ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />
              }
              onClick={handleExportCsv}
              disabled={exporting}
            >
              ייצא CSV
            </Button>
          </div>
        </div>
      </div>

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
              onClick={() => loadDeliveries(search, page)}
            >
              נסה שוב
            </Button>
          </div>
        </div>
      )}

      {/* Empty state (no error, not loading, nothing returned) */}
      {!error && !loading && deliveries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <TruckIcon className="w-14 h-14 mb-4 opacity-25" />
          <p className="text-base font-medium">לא נמצאו משלוחים</p>
          <p className="text-sm mt-1">נסה לשנות את הפילטרים</p>
        </div>
      )}

      {/* Deliveries table */}
      {!error && (
        <DeliveryList
          deliveries={deliveries}
          isLoading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={handleRowClick}
        />
      )}

      {/* Delivery details modal */}
      <DeliveryDetails
        delivery={selectedDelivery}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default Deliveries;
