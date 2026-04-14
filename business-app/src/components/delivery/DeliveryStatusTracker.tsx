import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeliveryStatus, DeliveryStatusEvent } from '../../types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDate } from '../../utils/formatters';

interface Step {
  status: DeliveryStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: Step[] = [
  { status: 'pending', label: 'ממתין לשליח', icon: 'hourglass-outline' },
  { status: 'searching_courier', label: 'מחפש שליח', icon: 'search-outline' },
  { status: 'courier_accepted', label: 'שליח בדרך', icon: 'bicycle-outline' },
  { status: 'picked_up', label: 'נאסף', icon: 'cube-outline' },
  { status: 'in_transit', label: 'בדרך', icon: 'navigate-outline' },
  { status: 'delivered', label: 'נמסר', icon: 'checkmark-circle-outline' },
];

const STATUS_ORDER: DeliveryStatus[] = [
  'pending',
  'searching_courier',
  'courier_accepted',
  'picked_up',
  'in_transit',
  'delivered',
];

interface DeliveryStatusTrackerProps {
  currentStatus: DeliveryStatus;
  statusHistory: DeliveryStatusEvent[];
}

export const DeliveryStatusTracker: React.FC<DeliveryStatusTrackerProps> = ({
  currentStatus,
  statusHistory,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'failed';
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const getTimestampForStatus = (status: DeliveryStatus): string | null => {
    const event = statusHistory.find((e) => e.status === status);
    return event ? formatDate(event.timestamp) : null;
  };

  if (isCancelled) {
    return (
      <View style={styles.cancelledContainer}>
        <Ionicons name="close-circle" size={40} color={colors.error} />
        <Text style={styles.cancelledText}>
          {currentStatus === 'cancelled' ? 'המשלוח בוטל' : 'המשלוח נכשל'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>מעקב משלוח</Text>
      {STEPS.map((step, index) => {
        const isCompleted = STATUS_ORDER.indexOf(step.status) < currentIndex;
        const isActive = step.status === currentStatus;
        const isPending = STATUS_ORDER.indexOf(step.status) > currentIndex;
        const timestamp = getTimestampForStatus(step.status);
        const isLast = index === STEPS.length - 1;

        return (
          <View key={step.status} style={styles.stepRow}>
            {/* Icon column */}
            <View style={styles.iconCol}>
              {isActive ? (
                <Animated.View style={[styles.activeIconWrap, { transform: [{ scale: pulseAnim }] }]}>
                  <Ionicons name={step.icon} size={18} color={colors.white} />
                </Animated.View>
              ) : isCompleted ? (
                <View style={styles.completedIconWrap}>
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                </View>
              ) : (
                <View style={styles.pendingIconWrap}>
                  <Ionicons name={step.icon} size={16} color={colors.textTertiary} />
                </View>
              )}
              {!isLast && (
                <View style={[styles.connector, isCompleted && styles.connectorCompleted]} />
              )}
            </View>

            {/* Content */}
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isActive && styles.stepLabelActive,
                  isPending && styles.stepLabelPending,
                ]}
              >
                {step.label}
              </Text>
              {timestamp && (
                <Text style={styles.timestamp}>{timestamp}</Text>
              )}
              {isActive && !timestamp && (
                <View style={styles.activeDot}>
                  <Text style={styles.activeNow}>עכשיו</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: 0,
  },
  iconCol: {
    alignItems: 'center',
    width: 36,
  },
  activeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  completedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  connectorCompleted: {
    backgroundColor: colors.success,
  },
  stepContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 24,
  },
  stepLabel: {
    ...typography.styles.body1,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  stepLabelCompleted: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepLabelPending: {
    color: colors.textTertiary,
  },
  timestamp: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  activeDot: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  activeNow: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  cancelledContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  cancelledText: {
    ...typography.styles.h4,
    color: colors.error,
  },
});
