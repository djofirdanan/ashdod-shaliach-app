import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PriceEstimate } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../common/Card';

interface PriceEstimatorProps {
  estimate: PriceEstimate;
  bonusLabel?: string;
  bonusAmount?: number;
}

export const PriceEstimator: React.FC<PriceEstimatorProps> = ({
  estimate,
  bonusLabel,
  bonusAmount,
}) => {
  const rows: { label: string; amount: number; icon: keyof typeof Ionicons.glyphMap; color?: string }[] = [
    { label: 'מחיר בסיס', amount: estimate.base, icon: 'pricetag-outline' },
    { label: 'עמלת מרחק', amount: estimate.distanceFee, icon: 'navigate-outline' },
    { label: 'אזור', amount: estimate.zoneFee, icon: 'location-outline' },
    { label: 'סוג חבילה', amount: estimate.packageTypeFee, icon: 'cube-outline' },
  ];

  if (bonusAmount && bonusAmount > 0) {
    rows.push({ label: bonusLabel || 'בונוס פעיל', amount: -bonusAmount, icon: 'gift-outline', color: colors.success });
  }

  return (
    <Card style={styles.container} shadow="sm" border>
      <View style={styles.header}>
        <Ionicons name="calculator-outline" size={20} color={colors.primary} />
        <Text style={styles.headerTitle}>פירוט מחיר</Text>
      </View>

      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text style={[styles.rowAmount, row.color ? { color: row.color } : {}]}>
            {row.amount < 0 ? `-${formatCurrency(Math.abs(row.amount))}` : formatCurrency(row.amount)}
          </Text>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Ionicons name={row.icon} size={16} color={row.color || colors.textSecondary} />
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <View style={styles.totalBadge}>
          <Text style={styles.totalAmount}>{formatCurrency(estimate.total)}</Text>
        </View>
        <Text style={styles.totalLabel}>סה"כ לתשלום</Text>
      </View>

      <View style={styles.etaRow}>
        <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
        <Text style={styles.etaText}>זמן משוער: {estimate.estimatedDuration} דקות</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowLabel: {
    ...typography.styles.body2,
    color: colors.textSecondary,
  },
  rowAmount: {
    ...typography.styles.body2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    ...typography.styles.h5,
    color: colors.textPrimary,
  },
  totalBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  etaText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
});
