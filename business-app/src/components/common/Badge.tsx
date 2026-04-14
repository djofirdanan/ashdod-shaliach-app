import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { DeliveryStatus, PackageType } from '../../types';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  dot = false,
  style,
}) => {
  return (
    <View style={[styles.badge, styles[variant], styles[size], style]}>
      {dot && <View style={[styles.dot, styles[`${variant}Dot` as keyof typeof styles]]} />}
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles], styles[`${size}Text` as keyof typeof styles]]}>
        {label}
      </Text>
    </View>
  );
};

export const StatusBadge: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const config: Record<DeliveryStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'ממתין', variant: 'neutral' },
    searching_courier: { label: 'מחפש שליח', variant: 'info' },
    courier_accepted: { label: 'שליח אישר', variant: 'primary' },
    picked_up: { label: 'נאסף', variant: 'warning' },
    in_transit: { label: 'בדרך', variant: 'primary' },
    delivered: { label: 'נמסר', variant: 'success' },
    cancelled: { label: 'בוטל', variant: 'error' },
    failed: { label: 'נכשל', variant: 'error' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'neutral' };
  return <Badge label={label} variant={variant} dot />;
};

export const PackageTypeBadge: React.FC<{ type: PackageType }> = ({ type }) => {
  const config: Record<PackageType, { label: string; variant: BadgeVariant }> = {
    regular: { label: 'רגיל', variant: 'info' },
    express: { label: 'אקספרס ⚡', variant: 'warning' },
    fragile: { label: 'שביר 🔴', variant: 'error' },
    vip: { label: 'VIP ✨', variant: 'primary' },
  };

  const { label, variant } = config[type] || { label: type, variant: 'neutral' };
  return <Badge label={label} variant={variant} size="sm" />;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  // Sizes
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  // Variants
  primary: { backgroundColor: '#EDE9FF' },
  secondary: { backgroundColor: '#FFE9EF' },
  success: { backgroundColor: '#E6FAF5' },
  warning: { backgroundColor: '#FFF8E7' },
  error: { backgroundColor: '#FFEEEA' },
  info: { backgroundColor: '#EBF5FF' },
  neutral: { backgroundColor: colors.border },

  // Text variants
  primaryText: { color: colors.primary },
  secondaryText: { color: colors.secondary },
  successText: { color: colors.success },
  warningText: { color: '#B7860D' },
  errorText: { color: colors.error },
  infoText: { color: '#2B7BE0' },
  neutralText: { color: colors.textSecondary },

  // Dot variants
  primaryDot: { backgroundColor: colors.primary },
  secondaryDot: { backgroundColor: colors.secondary },
  successDot: { backgroundColor: colors.success },
  warningDot: { backgroundColor: '#FDCB6E' },
  errorDot: { backgroundColor: colors.error },
  infoDot: { backgroundColor: colors.info },
  neutralDot: { backgroundColor: colors.textSecondary },

  // Text sizes
  text: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  smText: {
    fontSize: 11,
  },
  mdText: {
    fontSize: 12,
  },
});
