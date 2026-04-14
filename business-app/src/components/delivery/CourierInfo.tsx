import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Courier } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDuration } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Avatar } from '../common/Avatar';

interface CourierInfoProps {
  courier: Courier;
  estimatedArrival?: string;
  estimatedDuration?: number;
  onChat?: () => void;
}

const vehicleIcon = (type: Courier['vehicleType']): keyof typeof Ionicons.glyphMap => {
  if (type === 'motorcycle') return 'bicycle-outline';
  if (type === 'car') return 'car-outline';
  return 'bicycle-outline';
};

const vehicleLabel = (type: Courier['vehicleType']): string => {
  if (type === 'motorcycle') return 'אופנוע';
  if (type === 'car') return 'רכב';
  return 'אופניים';
};

export const CourierInfo: React.FC<CourierInfoProps> = ({
  courier,
  estimatedArrival,
  estimatedDuration,
  onChat,
}) => {
  const handleCall = () => {
    const phone = courier.phone.replace(/-/g, '');
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('שגיאה', 'לא ניתן לחייג כרגע')
    );
  };

  const eta = estimatedDuration ? formatDuration(estimatedDuration) : null;

  return (
    <Card style={styles.container} shadow="sm" border>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.headerTitle}>השליח שלך</Text>
        {eta && (
          <View style={styles.etaBadge}>
            <Ionicons name="time-outline" size={13} color={colors.primary} />
            <Text style={styles.etaText}>~{eta}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Avatar
          name={courier.name}
          imageUri={courier.photo}
          size="lg"
          online={courier.isOnline}
        />
        <View style={styles.info}>
          <Text style={styles.courierName}>{courier.name}</Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(courier.rating) ? 'star' : 'star-outline'}
                size={14}
                color="#F9CA24"
              />
            ))}
            <Text style={styles.ratingValue}>{courier.rating.toFixed(1)}</Text>
            <Text style={styles.totalDeliveries}>({courier.totalDeliveries} משלוחים)</Text>
          </View>

          <View style={styles.vehicleRow}>
            <Ionicons name={vehicleIcon(courier.vehicleType)} size={15} color={colors.textSecondary} />
            <Text style={styles.vehicleText}>{vehicleLabel(courier.vehicleType)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call-outline" size={18} color={colors.white} />
          <Text style={styles.callBtnText}>התקשר</Text>
        </TouchableOpacity>

        {onChat && (
          <TouchableOpacity style={styles.chatBtn} onPress={onChat} activeOpacity={0.8}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={styles.chatBtnText}>שלח הודעה</Text>
          </TouchableOpacity>
        )}
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
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    flex: 1,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FF',
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  etaText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  info: {
    flex: 1,
  },
  courierName: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  ratingValue: {
    ...typography.styles.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 2,
  },
  totalDeliveries: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    borderRadius: spacing.radiusMd,
    paddingVertical: 12,
    minHeight: 48,
  },
  callBtnText: {
    ...typography.styles.button,
    color: colors.white,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#EDE9FF',
    borderRadius: spacing.radiusMd,
    paddingVertical: 12,
    minHeight: 48,
  },
  chatBtnText: {
    ...typography.styles.button,
    color: colors.primary,
  },
});
