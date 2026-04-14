// ============================================================
// ACTIVE DELIVERY CARD - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';
import { Delivery, DeliveryStatus, DeliveryType } from '../../types';

interface ActiveDeliveryCardProps {
  delivery: Delivery;
  onActionPress: (delivery: Delivery) => void;
  onPress?: (delivery: Delivery) => void;
}

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; actionLabel: string | null }
> = {
  pending: { label: 'ממתין', color: Colors.warning, actionLabel: 'התחל ניווט לאיסוף' },
  accepted: { label: 'התקבל', color: Colors.primary, actionLabel: 'בדרך לאיסוף' },
  going_to_pickup: { label: 'בדרך לאיסוף', color: Colors.primary, actionLabel: 'הגעתי לעסק' },
  at_pickup: { label: 'באיסוף', color: Colors.busy, actionLabel: 'אספתי את החבילה' },
  picked_up: { label: 'נאסף', color: Colors.busy, actionLabel: 'בדרך למסירה' },
  going_to_delivery: { label: 'בדרך למסירה', color: Colors.info, actionLabel: 'הגעתי ליעד' },
  at_delivery: { label: 'ביעד', color: Colors.info, actionLabel: 'מסרתי' },
  delivered: { label: 'נמסר ✓', color: Colors.available, actionLabel: null },
  cancelled: { label: 'בוטל', color: Colors.decline, actionLabel: null },
  failed: { label: 'נכשל', color: Colors.decline, actionLabel: null },
};

const TYPE_ICONS: Record<DeliveryType, string> = {
  food: '🍔',
  package: '📦',
  document: '📄',
  grocery: '🛒',
  pharmacy: '💊',
  other: '📫',
};

const TYPE_LABELS: Record<DeliveryType, string> = {
  food: 'אוכל',
  package: 'חבילה',
  document: 'מסמך',
  grocery: 'מצרכים',
  pharmacy: 'תרופות',
  other: 'אחר',
};

export const ActiveDeliveryCard: React.FC<ActiveDeliveryCardProps> = ({
  delivery,
  onActionPress,
  onPress,
}) => {
  const statusConfig = STATUS_CONFIG[delivery.status];

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(delivery)}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {/* Header row: type badge + order number + status */}
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeIcon}>{TYPE_ICONS[delivery.type]}</Text>
          <Text style={styles.typeLabel}>{TYPE_LABELS[delivery.type]}</Text>
        </View>
        <Text style={styles.orderNumber}>#{delivery.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeSection}>
        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={styles.dotLine} />
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.businessName}>{delivery.business.name}</Text>
            <Text style={styles.address} numberOfLines={1}>
              {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => callPhone(delivery.business.phone)}
          >
            <Text style={styles.phoneIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery */}
        <View style={styles.routeRow}>
          <View style={styles.dotContainer}>
            <View style={[styles.dot, { backgroundColor: Colors.decline }]} />
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.customerName}>{delivery.customer.name}</Text>
            <Text style={styles.address} numberOfLines={1}>
              {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
              {delivery.deliveryAddress.floor ? `, קומה ${delivery.deliveryAddress.floor}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => callPhone(delivery.customer.phone)}
          >
            <Text style={styles.phoneIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{delivery.distance.toFixed(1)} ק"מ</Text>
          <Text style={styles.statLabel}>מרחק</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>~{delivery.estimatedDuration} דק'</Text>
          <Text style={styles.statLabel}>זמן</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.goldText]}>
            ₪{delivery.payment.total.toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>הכנסה</Text>
        </View>
      </View>

      {/* Action button */}
      {statusConfig.actionLabel && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onActionPress(delivery)}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>{statusConfig.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryUltraLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  orderNumber: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Route
  routeSection: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  dotContainer: {
    width: 20,
    alignItems: 'center',
    paddingTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  addressBlock: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  address: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  phoneButton: {
    padding: 4,
  },
  phoneIcon: {
    fontSize: 18,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  goldText: {
    color: '#F6C90E',
  },

  // Action
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
});

export default ActiveDeliveryCard;
