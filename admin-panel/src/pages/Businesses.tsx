import React, { useState, useEffect, useRef } from 'react';
import {
  BuildingStorefrontIcon,
  TruckIcon,
  StarIcon,
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
  fetchBusinesses,
  blockBusiness,
  unblockBusiness,
} from '../services/user.service';
import type { Business } from '../types';
import { demoBusinesses } from '../data/demoUsers';
import { formatCurrency } from '../utils/formatters';

const categoryColors: Record<string, string> = {
  'מסעדה': 'orange',
  'בית מרקחת': 'green',
  'סופרמרקט': 'blue',
  'פרחים': 'pink',
  'מכבסה': 'indigo',
  'אופטיקה': 'purple',
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-1">
    <StarSolid className="w-4 h-4 text-yellow-400" />
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
  </div>
);

const Businesses: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [blockModal, setBlockModal] = useState<{ open: boolean; business: Business | null }>({
    open: false,
    business: null,
  });
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBusinesses = async (searchVal: string, pg: number) => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchBusinesses({ search: searchVal || undefined, page: pg, limit: 20 });
      setBusinesses(result.data);
      setTotalPages(result.totalPages);
    } catch {
      // Backend not available — use demo data
      const filtered = searchVal
        ? demoBusinesses.filter((b) => b.name.includes(searchVal) || b.email?.includes(searchVal))
        : demoBusinesses;
      setBusinesses(filtered);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      loadBusinesses(search, 1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Client-side category filter
  const filtered = categoryFilter === 'all'
    ? businesses
    : businesses.filter((b) => b.category === categoryFilter);

  const categories = ['all', ...Array.from(new Set(businesses.map((b) => b.category)))];

  const totalOnPage = businesses.length;
  const activeOnPage = businesses.filter((b) => b.isActive && !b.isBlocked).length;
  const totalDeliveries = businesses.reduce((s, b) => s + b.totalDeliveries, 0);

  const handleBlock = async () => {
    if (!blockModal.business) return;
    setBlocking(true);
    try {
      await blockBusiness(blockModal.business.id, blockReason || 'חסום על ידי מנהל');
      toast.success(`עסק ${blockModal.business.name} נחסם בהצלחה`);
      setBlockModal({ open: false, business: null });
      setBlockReason('');
      loadBusinesses(search, page);
    } catch (err) {
      toast.error('שגיאה בחסימת העסק');
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (business: Business) => {
    try {
      await unblockBusiness(business.id);
      toast.success(`חסימת ${business.name} בוטלה`);
      loadBusinesses(search, page);
    } catch (err) {
      toast.error('שגיאה בביטול החסימה');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ניהול עסקים</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          ניהול כל העסקים הרשומים במערכת
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
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
              <BuildingStorefrontIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">עסקים פעילים</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeOnPage}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">סה"כ משלוחים</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalDeliveries.toLocaleString()}
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
              placeholder="חיפוש לפי שם, טלפון או כתובת..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'כל הקטגוריות' : cat}
              </option>
            ))}
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
              onClick={() => loadBusinesses(search, page)}
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
            <TableSkeleton rows={5} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    {['שם עסק', 'טלפון', 'כתובת', 'משלוחים', 'דירוג', 'הוצאות', 'סטטוס', 'פעולות'].map((h) => (
                      <th
                        key={h}
                        className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((business) => (
                    <tr
                      key={business.id}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <BuildingStorefrontIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                            <Badge
                              color={(categoryColors[business.category] as any) || 'gray'}
                              size="sm"
                            >
                              {business.category}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300" dir="ltr">
                        {business.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {business.address.street}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {business.totalDeliveries.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <RatingStars rating={business.rating} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        {formatCurrency(business.balance)}
                      </td>
                      <td className="px-4 py-3">
                        {business.isBlocked ? (
                          <Badge color="red" dot>חסום</Badge>
                        ) : business.isActive ? (
                          <Badge color="green" dot>פעיל</Badge>
                        ) : (
                          <Badge color="gray" dot>לא פעיל</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (business.isBlocked) {
                              handleUnblock(business);
                            } else {
                              setBlockModal({ open: true, business });
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            business.isBlocked
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                          }`}
                        >
                          {business.isBlocked ? (
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
                  <BuildingStorefrontIcon className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">לא נמצאו עסקים</p>
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

      {/* Business Details Modal */}
      <Modal
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        title="פרטי עסק"
        size="lg"
      >
        {selectedBusiness && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BuildingStorefrontIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedBusiness.name}</h3>
                <p className="text-gray-500 dark:text-gray-400" dir="ltr">{selectedBusiness.phone}</p>
                {selectedBusiness.contactPerson && (
                  <p className="text-sm text-gray-500">איש קשר: {selectedBusiness.contactPerson}</p>
                )}
              </div>
            </div>

            {selectedBusiness.isBlocked && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>חסום:</strong> {selectedBusiness.blockedReason}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">כתובת</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedBusiness.address.street}</p>
                <p className="text-xs text-gray-400">{selectedBusiness.address.city}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">קטגוריה</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedBusiness.category}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">סה"כ משלוחים</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedBusiness.totalDeliveries.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">יתרה</p>
                <p className="font-semibold text-green-600">{formatCurrency(selectedBusiness.balance)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">דירוג</p>
                <RatingStars rating={selectedBusiness.rating} />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">הצטרף בתאריך</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedBusiness.joinedAt}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Block Reason Modal */}
      <Modal
        isOpen={blockModal.open}
        onClose={() => { setBlockModal({ open: false, business: null }); setBlockReason(''); }}
        title={`חסימת עסק: ${blockModal.business?.name}`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setBlockModal({ open: false, business: null }); setBlockReason(''); }}
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
            האם אתה בטוח שברצונך לחסום את העסק {blockModal.business?.name}?
          </p>
          <Input
            label="סיבת החסימה (אופציונלי)"
            placeholder="לדוגמה: הפרת תנאי שימוש"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Businesses;
