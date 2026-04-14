// ============================================================
// EARNINGS CARD - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';
import { Earnings } from '../../types';

interface EarningsCardProps {
  earnings?: Earnings;
  totalDeliveries?: number;
  totalKm?: number;
  onPress?: () => void;
  compact?: boolean;
}

export const EarningsCard: React.FC<EarningsCardProps> = ({
  earnings,
  totalDeliveries = 0,
  totalKm = 0,
  onPress,
  compact = false,
}) => {
  const total = earnings?.total ?? 0;
  const base = earnings?.baseAmount ?? 0;
  const bonuses = earnings?.bonuses ?? 0;
  const tips = earnings?.tips ?? 0;
  const deliveries = earnings?.deliveries ?? totalDeliveries;

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={onPress ? 0.85 : 1}
      >
        <View style={styles.compactLeft}>
          <Text style={styles.compactIcon}>💰</Text>
          <View>
            <Text style={styles.compactLabel}>הכנסה היום</Text>
            <Text style={styles.compactTotal}>₪{total.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.compactRight}>
          <Text style={styles.compactDeliveries}>{deliveries}</Text>
          <Text style={styles.compactDeliveriesLabel}>משלוחים</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הכנסה היום</Text>
        {onPress && <Text style={styles.headerArrow}>←</Text>}
      </View>

      {/* Big total */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalPrefix}>₪</Text>
        <Text style={styles.totalAmount}>{total.toFixed(0)}</Text>
        <Text style={styles.totalCents}>
          .{(total % 1).toFixed(2).slice(2)}
        </Text>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <View style={[styles.breakdownDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.breakdownLabel}>בסיס</Text>
          <Text style={styles.breakdownValue}>₪{base.toFixed(2)}</Text>
        </View>
        {bonuses > 0 && (
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: '#F6C90E' }]} />
            <Text style={styles.breakdownLabel}>בונוסים 🎯</Text>
            <Text style={[styles.breakdownValue, styles.bonusValue]}>
              +₪{bonuses.toFixed(2)}
            </Text>
          </View>
        )}
        {tips > 0 && (
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: Colors.available }]} />
            <Text style={styles.breakdownLabel}>טיפים 💸</Text>
            <Text style={[styles.breakdownValue, styles.tipValue]}>
              +₪{tips.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>📦</Text>
          <Text style={styles.statValue}>{deliveries}</Text>
          <Text style={styles.statLabel}>משלוחים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🏍️</Text>
          <Text style={styles.statValue}>{totalKm.toFixed(1)}</Text>
          <Text style={styles.statLabel}>ק"מ</Text>
        </View>
        {deliveries > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statValue}>₪{(total / deliveries).toFixed(0)}</Text>
              <Text style={styles.statLabel}>ממוצע</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1F30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(246, 201, 14, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerArrow: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
  },

  totalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  totalPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F6C90E',
    marginTop: 8,
    marginRight: 2,
  },
  totalAmount: {
    fontSize: 60,
    fontWeight: '900',
    color: '#F6C90E',
    lineHeight: 68,
  },
  totalCents: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(246, 201, 14, 0.7)',
    marginTop: 10,
    marginLeft: 2,
  },

  breakdown: {
    marginBottom: Spacing.lg,
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  bonusValue: {
    color: '#F6C90E',
  },
  tipValue: {
    color: '#00E676',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Compact variant
  compactCard: {
    backgroundColor: '#1E1F30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(246, 201, 14, 0.15)',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  compactIcon: {
    fontSize: 28,
  },
  compactLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  compactTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F6C90E',
  },
  compactRight: {
    alignItems: 'center',
  },
  compactDeliveries: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
  },
  compactDeliveriesLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
});

export default EarningsCard;
