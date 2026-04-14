// ============================================================
// BADGE COMPONENT - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gray'
  | 'gold'
  | 'available'
  | 'busy'
  | 'offline';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  style,
  dot = false,
}) => {
  return (
    <View style={[styles.badge, styles[`variant_${variant}`], styles[`size_${size}`], style]}>
      {dot && <View style={[styles.dot, styles[`dotColor_${variant}`]]} />}
      <Text style={[styles.text, styles[`textSize_${size}`], styles[`textColor_${variant}`]]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  // Sizes
  size_sm: { paddingVertical: 2, paddingHorizontal: 8 },
  size_md: { paddingVertical: 4, paddingHorizontal: 10 },
  size_lg: { paddingVertical: 6, paddingHorizontal: 14 },

  // Variants (background)
  variant_primary: { backgroundColor: Colors.primaryUltraLight },
  variant_success: { backgroundColor: Colors.successLight },
  variant_warning: { backgroundColor: Colors.warningLight },
  variant_danger: { backgroundColor: Colors.errorLight },
  variant_info: { backgroundColor: Colors.infoLight },
  variant_gray: { backgroundColor: Colors.offlineLight },
  variant_gold: { backgroundColor: Colors.goldLight },
  variant_available: { backgroundColor: Colors.availableLight },
  variant_busy: { backgroundColor: Colors.busyLight },
  variant_offline: { backgroundColor: Colors.offlineLight },

  // Text sizes
  textSize_sm: { fontSize: 11, fontWeight: '600' },
  textSize_md: { fontSize: 12, fontWeight: '600' },
  textSize_lg: { fontSize: 14, fontWeight: '600' },

  // Text colors
  textColor_primary: { color: Colors.primary },
  textColor_success: { color: Colors.success },
  textColor_warning: { color: Colors.warning },
  textColor_danger: { color: Colors.error },
  textColor_info: { color: Colors.info },
  textColor_gray: { color: Colors.offline },
  textColor_gold: { color: Colors.goldDark },
  textColor_available: { color: Colors.availableDark },
  textColor_busy: { color: Colors.busyDark },
  textColor_offline: { color: Colors.offlineDark },

  // Dot colors
  dotColor_primary: { backgroundColor: Colors.primary },
  dotColor_success: { backgroundColor: Colors.success },
  dotColor_warning: { backgroundColor: Colors.warning },
  dotColor_danger: { backgroundColor: Colors.error },
  dotColor_info: { backgroundColor: Colors.info },
  dotColor_gray: { backgroundColor: Colors.offline },
  dotColor_gold: { backgroundColor: Colors.gold },
  dotColor_available: { backgroundColor: Colors.available },
  dotColor_busy: { backgroundColor: Colors.busy },
  dotColor_offline: { backgroundColor: Colors.offline },
});

export default Badge;
