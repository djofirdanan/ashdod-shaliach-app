import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { StatusBadge, PackageTypeBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { Delivery } from '../../types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatCurrency, formatRelativeTime, formatDuration } from '../../utils/formatters';
import { mapsService } from '../../services/maps.service';

interface DeliveryCardProps {
  delivery: Delivery;
  onPress: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  delivery,
  onPress,
  onCancel,
  compact = false,
}) => {
  const pickupStr = mapsService.formatAddressForDisplay(delivery.pickupAddress);
  const deliveryStr = mapsService.formatAddressForDisplay(delivery.deliveryAddress);
  const isActive = !['delivered', 'cancelled', 'failed'].includes(delivery.status);

  return (
    <Card onPress={onPress} style={styles.card} shadow="md">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>#{delivery.id.slice(-5)}</Text>
        </View>
        <StatusBadge status={delivery.status} />
        <PackageTypeBadge type={delivery.packageType} />
      </View>

      {/* Courier info if assigned */}
      {delivery.courier && !compact && (
        <View style={styles.courierRow}>
          <Avatar
            name={delivery.courier.name}
            imageUri={delivery.courier.photo}
            size="sm"
            online={delivery.courier.isOnline}
          />
          <View style={styles.courierInfo}>
            <Text style={styles.courierName}>{delivery.courier.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#F9CA24" />
              <Text style={styles.ratingText}>{delivery.courier.rating.toFixed(1)}</Text>
              <Text style={styles.vehicleText}>
                {delivery.courier.vehicleType === 'motorcycle'
                  ? '🏍'
                  : delivery.courier.vehicleType === 'car'
                  ? '🚗'
                  : '🚲'}
              </Text>
            </View>
          </View>
          {delivery.estimatedArrival && (
            <View style={styles.etaChip}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={styles.etaText}>
                ~{formatDuration(delivery.estimatedDuration || 25)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.pickupDot]} />
          <View style={styles.routeTextBox}>
            <Text style={styles.routeLabel}>איסוף</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>{pickupStr}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.deliveryDot]} />
          <View style={styles.routeTextBox}>
            <Text style={styles.routeLabel}>משלוח</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>{deliveryStr}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.time}>{formatRelativeTime(delivery.createdAt)}</Text>
        <View style={styles.footerRight}>
          <Text style={styles.price}>{formatCurrency(delivery.price)}</Text>
          {isActive && onCancel && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>ביטול</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rating badge for delivered */}
      {delivery.status === 'delivered' && delivery.rating && (
        <View style={styles.ratingBadge}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= delivery.rating! ? 'star' : 'star-outline'}
              size={14}
              color="#F9CA24"
            />
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  idBadge: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  idText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.radiusMd,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    ...typography.styles.label,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  vehicleText: {
    fontSize: 12,
  },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  etaText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  route: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  pickupDot: {
    backgroundColor: colors.primary,
  },
  deliveryDot: {
    backgroundColor: colors.secondary,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeTextBox: {
    flex: 1,
    marginBottom: 2,
  },
  routeLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  routeAddress: {
    ...typography.styles.body2,
    color: colors.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  time: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    ...typography.styles.body1,
    color: colors.primary,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cancelText: {
    ...typography.styles.caption,
    color: colors.error,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
});
