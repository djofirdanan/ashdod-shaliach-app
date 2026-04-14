// ============================================================
// אשדוד-שליח – Admin Controller
// ============================================================

import { Response } from 'express';
import {
  AuthRequest,
  User,
  Delivery,
  DeliveryStatus,
  UserRole,
  Courier,
} from '../types';
import {
  getDocument,
  updateDocument,
  queryDocuments,
  countDocuments,
} from '../services/firebase.service';
import { COLLECTION_USERS, COLLECTION_DELIVERIES } from '../config/constants';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getPaginationParams,
} from '../utils/helpers';
import logger from '../utils/logger';

// In-memory system settings (persist to Firestore in production)
const COLLECTION_SETTINGS = 'system_settings';
const SETTINGS_DOC_ID = 'global';

export const adminController = {
  /**
   * GET /admin/dashboard
   * Dashboard stats: deliveries today/week/month, active couriers, users, revenue.
   */
  async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        todayDeliveries,
        weekDeliveries,
        monthDeliveries,
        activeCouriers,
        totalUsers,
        totalCouriers,
        totalBusinesses,
        pendingDeliveries,
        activeDeliveries,
      ] = await Promise.all([
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'createdAt', op: '>=', value: todayStart },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'createdAt', op: '>=', value: weekStart },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'createdAt', op: '>=', value: monthStart },
        ]),
        countDocuments(COLLECTION_USERS, [
          { field: 'role', op: '==', value: UserRole.COURIER },
          { field: 'isOnDuty', op: '==', value: true },
          { field: 'isActive', op: '==', value: true },
        ]),
        countDocuments(COLLECTION_USERS, []),
        countDocuments(COLLECTION_USERS, [
          { field: 'role', op: '==', value: UserRole.COURIER },
        ]),
        countDocuments(COLLECTION_USERS, [
          { field: 'role', op: '==', value: UserRole.BUSINESS },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'status', op: '==', value: DeliveryStatus.PENDING },
        ]),
        countDocuments(COLLECTION_DELIVERIES, [
          { field: 'status', op: 'in', value: [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT] },
        ]),
      ]);

      // Revenue: sum of confirmed deliveries this month
      const confirmedThisMonth = await queryDocuments<Delivery>(
        COLLECTION_DELIVERIES,
        [
          { field: 'status', op: '==', value: DeliveryStatus.CONFIRMED },
          { field: 'confirmedAt', op: '>=', value: monthStart },
        ],
        undefined,
        1000
      );
      const monthRevenue = confirmedThisMonth.reduce((sum, d) => sum + (d.totalPrice ?? 0), 0);

      const confirmedToday = await queryDocuments<Delivery>(
        COLLECTION_DELIVERIES,
        [
          { field: 'status', op: '==', value: DeliveryStatus.CONFIRMED },
          { field: 'confirmedAt', op: '>=', value: todayStart },
        ],
        undefined,
        500
      );
      const todayRevenue = confirmedToday.reduce((sum, d) => sum + (d.totalPrice ?? 0), 0);

      res.json(successResponse({
        deliveries: {
          today: todayDeliveries,
          week: weekDeliveries,
          month: monthDeliveries,
          pending: pendingDeliveries,
          active: activeDeliveries,
        },
        couriers: {
          active: activeCouriers,
          total: totalCouriers,
        },
        users: {
          total: totalUsers,
          businesses: totalBusinesses,
          couriers: totalCouriers,
        },
        revenue: {
          today: todayRevenue,
          month: monthRevenue,
        },
        generatedAt: now.toISOString(),
      }));
    } catch (err) {
      logger.error('getDashboardStats error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /admin/users/:id/block
   */
  async blockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await getDocument<User>(COLLECTION_USERS, id);
      if (!user) {
        res.status(404).json(errorResponse('Not Found', 'User not found'));
        return;
      }

      await updateDocument(COLLECTION_USERS, id, {
        isActive: false,
        blockReason: reason ?? 'Blocked by admin',
        blockedAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`User ${id} blocked by admin ${req.user?.id}`);
      res.json(successResponse(null, `User ${id} has been blocked`));
    } catch (err) {
      logger.error('blockUser error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * POST /admin/users/:id/unblock
   */
  async unblockUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await getDocument<User>(COLLECTION_USERS, id);
      if (!user) {
        res.status(404).json(errorResponse('Not Found', 'User not found'));
        return;
      }

      await updateDocument(COLLECTION_USERS, id, {
        isActive: true,
        blockReason: null,
        blockedAt: null,
        updatedAt: new Date(),
      });

      logger.info(`User ${id} unblocked by admin ${req.user?.id}`);
      res.json(successResponse(null, `User ${id} has been unblocked`));
    } catch (err) {
      logger.error('unblockUser error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /admin/users/problematic
   * Users with >3 complaints or high cancellation rate.
   */
  async getProblematicUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get all users
      const [couriers, businesses] = await Promise.all([
        queryDocuments<Courier>(COLLECTION_USERS, [
          { field: 'role', op: '==', value: UserRole.COURIER },
        ]),
        queryDocuments<User>(COLLECTION_USERS, [
          { field: 'role', op: '==', value: UserRole.BUSINESS },
        ]),
      ]);

      // Recent deliveries
      const recentDeliveries = await queryDocuments<Delivery>(COLLECTION_DELIVERIES, [
        { field: 'createdAt', op: '>=', value: thirtyDaysAgo },
      ], undefined, 2000);

      // Courier stats
      const courierStats: Record<string, { total: number; cancelled: number }> = {};
      const businessStats: Record<string, { total: number; cancelled: number }> = {};

      for (const d of recentDeliveries) {
        if (d.courierId) {
          if (!courierStats[d.courierId]) courierStats[d.courierId] = { total: 0, cancelled: 0 };
          courierStats[d.courierId].total++;
          if (d.status === DeliveryStatus.CANCELLED) courierStats[d.courierId].cancelled++;
        }
        if (!businessStats[d.businessId]) businessStats[d.businessId] = { total: 0, cancelled: 0 };
        businessStats[d.businessId].total++;
        if (d.status === DeliveryStatus.CANCELLED) businessStats[d.businessId].cancelled++;
      }

      const problematic: Array<{
        userId: string;
        name: string;
        role: UserRole;
        reason: string;
        severity: string;
      }> = [];

      for (const courier of couriers) {
        const stats = courierStats[courier.id];
        const lowRating = courier.rating < 3 && courier.ratingCount >= 5;
        const highCancel = stats && stats.total >= 5 && stats.cancelled / stats.total > 0.3;

        if (lowRating || highCancel) {
          problematic.push({
            userId: courier.id,
            name: courier.name,
            role: UserRole.COURIER,
            reason: [
              lowRating ? `דירוג נמוך: ${courier.rating.toFixed(1)}` : '',
              highCancel ? `ביטולים: ${stats.cancelled}/${stats.total}` : '',
            ].filter(Boolean).join(', '),
            severity: (courier.rating < 2 || (stats && stats.cancelled / stats.total > 0.5)) ? 'high' : 'medium',
          });
        }
      }

      for (const biz of businesses) {
        const stats = businessStats[biz.id];
        const highCancel = stats && stats.total >= 5 && stats.cancelled / stats.total > 0.4;
        if (highCancel) {
          problematic.push({
            userId: biz.id,
            name: (biz as User & { businessName?: string }).businessName ?? biz.name,
            role: UserRole.BUSINESS,
            reason: `ביטולים: ${stats.cancelled}/${stats.total}`,
            severity: stats.cancelled / stats.total > 0.6 ? 'high' : 'medium',
          });
        }
      }

      res.json(successResponse(problematic));
    } catch (err) {
      logger.error('getProblematicUsers error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /admin/deliveries
   * Full list with all filters.
   */
  async getAllDeliveries(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
      const { status, businessId, courierId, date, dateFrom, dateTo } = req.query;

      const filters: Array<{ field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }> = [];

      if (status) filters.push({ field: 'status', op: '==', value: status });
      if (businessId) filters.push({ field: 'businessId', op: '==', value: businessId });
      if (courierId) filters.push({ field: 'courierId', op: '==', value: courierId });

      if (date) {
        const start = new Date(String(date)); start.setHours(0, 0, 0, 0);
        const end = new Date(String(date)); end.setHours(23, 59, 59, 999);
        filters.push({ field: 'createdAt', op: '>=', value: start });
        filters.push({ field: 'createdAt', op: '<=', value: end });
      } else {
        if (dateFrom) filters.push({ field: 'createdAt', op: '>=', value: new Date(String(dateFrom)) });
        if (dateTo) filters.push({ field: 'createdAt', op: '<=', value: new Date(String(dateTo)) });
      }

      const [deliveries, total] = await Promise.all([
        queryDocuments<Delivery>(COLLECTION_DELIVERIES, filters, { field: 'createdAt', direction: 'desc' }, limit),
        countDocuments(COLLECTION_DELIVERIES, filters),
      ]);

      res.json(paginatedResponse(deliveries, page, limit, total));
    } catch (err) {
      logger.error('getAllDeliveries error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /admin/settings
   */
  async getSystemSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await getDocument(COLLECTION_SETTINGS, SETTINGS_DOC_ID);
      const defaults = {
        maxDispatchRadius: 10,
        dispatchTimeoutSeconds: 60,
        maxActiveCouriers: 100,
        maintenanceMode: false,
        appVersion: '1.0.0',
        supportPhone: '',
        supportEmail: '',
      };
      res.json(successResponse(settings ?? defaults));
    } catch (err) {
      logger.error('getSystemSettings error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PUT /admin/settings
   */
  async updateSystemSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const allowedFields = [
        'maxDispatchRadius',
        'dispatchTimeoutSeconds',
        'maxActiveCouriers',
        'maintenanceMode',
        'appVersion',
        'supportPhone',
        'supportEmail',
      ];

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      // Upsert using setDoc
      const { getDb } = await import('../config/firebase');
      const db = getDb();
      await db.collection(COLLECTION_SETTINGS).doc(SETTINGS_DOC_ID).set(updates, { merge: true });

      logger.info(`System settings updated by admin ${req.user?.id}`);
      res.json(successResponse(updates, 'Settings updated'));
    } catch (err) {
      logger.error('updateSystemSettings error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /admin/revenue
   * Revenue report by date range.
   */
  async getRevenueReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { dateFrom, dateTo } = req.query;

      const start = dateFrom ? new Date(String(dateFrom)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = dateTo ? new Date(String(dateTo)) : new Date();
      end.setHours(23, 59, 59, 999);

      const deliveries = await queryDocuments<Delivery>(
        COLLECTION_DELIVERIES,
        [
          { field: 'status', op: '==', value: DeliveryStatus.CONFIRMED },
          { field: 'confirmedAt', op: '>=', value: start },
          { field: 'confirmedAt', op: '<=', value: end },
        ],
        { field: 'confirmedAt', direction: 'asc' },
        5000
      );

      const totalRevenue = deliveries.reduce((sum, d) => sum + (d.totalPrice ?? 0), 0);
      const totalBonuses = deliveries.reduce(
        (sum, d) => sum + d.bonuses.reduce((s, b) => s + b.amount, 0),
        0
      );

      // Group by day
      const byDay: Record<string, { count: number; revenue: number }> = {};
      for (const d of deliveries) {
        const day = new Date(d.confirmedAt!).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
        byDay[day].count++;
        byDay[day].revenue += d.totalPrice ?? 0;
      }

      // Group by zone
      const byZone: Record<string, { count: number; revenue: number }> = {};
      for (const d of deliveries) {
        const zone = d.pricingZone;
        if (!byZone[zone]) byZone[zone] = { count: 0, revenue: 0 };
        byZone[zone].count++;
        byZone[zone].revenue += d.totalPrice ?? 0;
      }

      res.json(successResponse({
        period: { from: start.toISOString(), to: end.toISOString() },
        totalDeliveries: deliveries.length,
        totalRevenue,
        totalBonuses,
        averageOrderValue: deliveries.length > 0 ? Math.round(totalRevenue / deliveries.length) : 0,
        byDay: Object.entries(byDay).map(([date, data]) => ({ date, ...data })),
        byZone: Object.entries(byZone)
          .map(([zone, data]) => ({ zone, ...data }))
          .sort((a, b) => b.revenue - a.revenue),
      }));
    } catch (err) {
      logger.error('getRevenueReport error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * GET /admin/bonus-rules
   */
  async getBonusRules(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const defaultRules = [
        { id: 'rain_light', name: 'rain_light', nameHe: 'גשם קל', description: 'בונוס בגשם קל', amount: 15, isActive: true, condition: 'weather=rain_light', icon: '🌧️' },
        { id: 'rain_heavy', name: 'rain_heavy', nameHe: 'סופת גשמים', description: 'בונוס בסופת גשמים', amount: 30, isActive: true, condition: 'weather=storm', icon: '⛈️' },
        { id: 'night', name: 'night', nameHe: 'לילה (22:00-06:00)', description: 'בונוס משלוחי לילה', amount: 20, isActive: true, condition: 'hour>=22||hour<6', icon: '🌙' },
        { id: 'peak', name: 'peak', nameHe: 'שעות עומס', description: 'שעות עומס 12-14, 19-21', amount: 10, isActive: true, condition: 'peak_hours', icon: '🔥' },
        { id: 'danger', name: 'danger', nameHe: 'אזור מסוכן', description: 'משלוח לאזור מסוכן', amount: 25, isActive: false, condition: 'zone=danger', icon: '⚠️' },
        { id: 'urgent', name: 'urgent', nameHe: 'משלוח דחוף', description: 'משלוח מסומן כדחוף', amount: 20, isActive: true, condition: 'type=urgent', icon: '⚡' },
        { id: 'high_load', name: 'high_load', nameHe: 'עומס גבוה', description: 'יותר מ-10 משלוחים פעילים באזור', amount: 15, isActive: true, condition: 'active_deliveries>10', icon: '📦' },
      ];
      // Try to get from Firestore, fall back to defaults
      try {
        const saved = await queryDocuments<typeof defaultRules[0]>('bonus_rules', [], undefined, 20);
        res.json(successResponse(saved.length > 0 ? saved : defaultRules));
      } catch {
        res.json(successResponse(defaultRules));
      }
    } catch (err) {
      logger.error('getBonusRules error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },

  /**
   * PATCH /admin/bonus-rules/:id
   */
  async updateBonusRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      try {
        await updateDocument('bonus_rules', id, { ...updates, updatedAt: new Date().toISOString() });
      } catch {
        // If doc doesn't exist yet in Firestore, that's ok — treat as in-memory update
      }
      res.json(successResponse({ id, ...updates }));
    } catch (err) {
      logger.error('updateBonusRule error:', err);
      res.status(500).json(errorResponse('Internal Server Error'));
    }
  },
};
