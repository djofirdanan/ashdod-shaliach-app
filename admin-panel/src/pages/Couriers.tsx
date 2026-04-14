import React, { useState, useEffect, useRef } from 'react';
import {
  UserGroupIcon,
  StarIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import {
  fetchCouriers,
  blockCourier,
  unblockCourier,
} from '../services/user.service';
import type { Courier, VehicleType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { VEHICLE_TYPE_LABELS } from '../utils/constants';

const vehicleLabels: Record<VehicleType, string> = {
  motorcycle: VEHICLE_TYPE_LABELS.motorcycle,
  bicycle: VEHICLE_TYPE_LABELS.bicycle,
  car: VEHICLE_TYPE_LABELS.car,
  scooter: VEHICLE_TYPE_LABELS.scooter,
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-1">
    <StarSolid className="w-4 h-4 text-yellow-400" />
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
  </div>
);

const Couriers: React.FC = () => {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [blockModal, setBlockModal] = useState<{ open: boolean; courier: Courier | null }>({
    open: false,
    courier: null,
  });
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCouriers = async (searchVal: string, pg: number) => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchCouriers({ search: searchVal || undefined, page: pg, limit: 20 });
      setCouriers(result.data);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת השליחים');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadCouriers(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      loadCouriers(search, 1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = vehicleFilter === 'all'
    ? couriers
    : couriers.filter((c) => c.vehicle === vehicleFilter);

  // Client-side stats from loaded page
  const totalOnPage = couriers.length;
  const activeOnPage = couriers.filter((c) => c.isActive && !c.isBlocked).length;
  const avgRating = totalOnPage > 0
    ? couriers.reduce((sum, c) => sum + c.rating, 0) / totalOnPage
    : 0;

  const handleBlock = async () => {
    if (!blockModal.courier) return;
    setBlocking(true);
    try {
      await blockCourier(blockModal.courier.id, blockReason || 'חסום על ידי מנהל');
      toast.success(`שליח ${blockModal.courier.name} נחסם בהצלחה`);
      setBlockModal({ open: false, courier: null });
      setBlockReason('');
      loadCouriers(search, page);
    } catch (err) {
      toast.error('שגיאה בחסימת השליח');
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (courier: Courier) => {
    try {
      await unblockCourier(courier.id);
      toast.success(`חסימת ${courier.name} בוטלה`);
      loadCouriers(search, page);
    } catch (err) {
      toast.error('שגיאה בביטול החסימה');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול שליחים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            ניהול וניטור כל השליחים במערכת
          </p>
        </div>
      </div>

      {/* Stats row — computed from current page data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">סה"כ בעמוד</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOnPage}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">פעילים כעת</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeOnPage}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
              <StarIcon className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">דירוג ממוצע</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalOnPage > 0 ? avgRating.toFixed(1) : '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="חיפוש לפי שם או טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            />
          </div>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">כל הרכבים</option>
            <option value="motorcycle">אופנוע</option>
            <option value="car">רכב</option>
            <option value="scooter">קטנוע</option>
            <option value="bicycle">אופניים</option>
          </select>
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
              onClick={() => loadCouriers(search, page)}
            >
              נסה שוב
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {!error && (
        <Card padding="none">
          {loading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    {['שם', 'טלפון', 'רכב', 'דירוג', 'פעילים', 'סה"כ', 'הכנסות', 'סטטוס', 'פעולות'].map((h) => (
                      <th
                        key={h}
                        className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((courier) => (
                    <tr
                      key={courier.id}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedCourier(courier)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-700 dark:text-purple-400 font-semibold text-xs">
                              {courier.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{courier.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300" dir="ltr">{courier.phone}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {vehicleLabels[courier.vehicle] ?? courier.vehicle}
                      </td>
                      <td className="px-4 py-3">
                        <RatingStars rating={courier.rating} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${courier.activeDeliveries > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {courier.activeDeliveries}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {courier.totalDeliveries.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">
                        {formatCurrency(courier.earnings.thisMonth)}
                      </td>
                      <td className="px-4 py-3">
                        {courier.isBlocked ? (
                          <Badge color="red" dot>חסום</Badge>
                        ) : courier.isActive ? (
                          <Badge color="green" dot>פעיל</Badge>
                        ) : (
                          <Badge color="gray" dot>לא זמין</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (courier.isBlocked) {
                              handleUnblock(courier);
                            } else {
                              setBlockModal({ open: true, courier });
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            courier.isBlocked
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                          }`}
                        >
                          {courier.isBlocked ? (
                            <><CheckCircleIcon className="w-3.5 h-3.5" /> בטל חסימה</>
                          ) : (
                            <><NoSymbolIcon className="w-3.5 h-3.5" /> חסום</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">לא נמצאו שליחים</p>
                  {search && (
                    <p className="text-xs mt-1 text-gray-400">נסה לשנות את מילות החיפוש</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                הקודם
              </Button>
              <span className="text-sm text-gray-500">
                עמוד {page} מתוך {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                הבא
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Courier Details Modal */}
      <Modal
        isOpen={!!selectedCourier}
        onClose={() => setSelectedCourier(null)}
        title="פרטי שליח"
        size="lg"
      >
        {selectedCourier && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="text-purple-700 dark:text-purple-400 font-bold text-2xl">
                  {selectedCourier.name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCourier.name}</h3>
                <p className="text-gray-500 dark:text-gray-400" dir="ltr">{selectedCourier.phone}</p>
                {selectedCourier.isBlocked && (
                  <div className="mt-1">
                    <Badge color="red">חסום: {selectedCourier.blockedReason}</Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">רכב</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {vehicleLabels[selectedCourier.vehicle] ?? selectedCourier.vehicle}
                </p>
                {selectedCourier.vehiclePlate && (
                  <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{selectedCourier.vehiclePlate}</p>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">דירוג</p>
                <RatingStars rating={selectedCourier.rating} />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">סה"כ משלוחים</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedCourier.totalDeliveries.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">הצטרף בתאריך</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCourier.joinedAt}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">רווחים</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedCourier.earnings.today)}</p>
                  <p className="text-xs text-gray-400">היום</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedCourier.earnings.thisWeek)}</p>
                  <p className="text-xs text-gray-400">השבוע</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedCourier.earnings.thisMonth)}</p>
                  <p className="text-xs text-gray-400">החודש</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{formatCurrency(selectedCourier.earnings.total)}</p>
                  <p className="text-xs text-gray-400">סה"כ</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Block Reason Modal */}
      <Modal
        isOpen={blockModal.open}
        onClose={() => { setBlockModal({ open: false, courier: null }); setBlockReason(''); }}
        title={`חסימת שליח: ${blockModal.courier?.name}`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setBlockModal({ open: false, courier: null }); setBlockReason(''); }}
            >
              ביטול
            </Button>
            <Button variant="danger" onClick={handleBlock} disabled={blocking}>
              {blocking ? 'חוסם...' : 'אשר חסימה'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            האם אתה בטוח שברצונך לחסום את השליח {blockModal.courier?.name}?
          </p>
          <Input
            label="סיבת החסימה (אופציונלי)"
            placeholder="לדוגמה: התנהגות לא הולמת"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Couriers;
