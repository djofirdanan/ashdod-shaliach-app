// ============================================================
// DELIVERY POPUP - אשדוד-שליח Courier App
// Full-screen animated popup for new delivery requests
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';
import { Delivery, DeliveryType } from '../../types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const COUNTDOWN_SECONDS = 45;

interface DeliveryPopupProps {
  delivery: Delivery;
  onAccept: (deliveryId: string) => void;
  onDecline: (deliveryId: string) => void;
  visible: boolean;
}

const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  food: '🍔 אוכל',
  package: '📦 חבילה',
  document: '📄 מסמך',
  grocery: '🛒 מצרכים',
  pharmacy: '💊 תרופות',
  other: '📫 אחר',
};

function CircularCountdown({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const strokeDashoffset = circumference * (1 - progress);
  const color =
    seconds > 20
      ? Colors.available
      : seconds > 10
      ? Colors.warning
      : Colors.countdown;

  return (
    <View style={circleStyles.container}>
      <Animated.View style={[circleStyles.svgContainer]}>
        {/* Background ring */}
        <View
          style={[
            circleStyles.ring,
            { borderColor: Colors.border, borderWidth: 4 },
          ]}
        />
        {/* Progress indicator using a rotation approach */}
        <View
          style={[
            circleStyles.progressContainer,
            {
              transform: [{ rotate: `${-90 + (1 - progress) * 360}deg` }],
            },
          ]}
        >
          <View
            style={[
              circleStyles.progressDot,
              { backgroundColor: color },
            ]}
          />
        </View>
        {/* Arc using border trick */}
        <View
          style={[
            circleStyles.arcOuter,
            {
              borderTopColor: color,
              borderRightColor: progress > 0.25 ? color : 'transparent',
              borderBottomColor: progress > 0.5 ? color : 'transparent',
              borderLeftColor: progress > 0.75 ? color : 'transparent',
            },
          ]}
        />
      </Animated.View>
      <Text style={[circleStyles.countdownText, { color }]}>{seconds}</Text>
      <Text style={circleStyles.secLabel}>שנ'</Text>
    </View>
  );
}

const circleStyles = StyleSheet.create({
  container: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  progressContainer: {
    position: 'absolute',
    width: 78,
    height: 78,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -3,
  },
  arcOuter: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderTopColor: Colors.available,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  countdownText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  secLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: -2,
  },
});

export const DeliveryPopup: React.FC<DeliveryPopupProps> = ({
  delivery,
  onAccept,
  onDecline,
  visible,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasDismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (hasDismissed.current) return;
    hasDismissed.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  useEffect(() => {
    if (!visible) return;

    hasDismissed.current = false;
    setCountdown(COUNTDOWN_SECONDS);

    // Vibration pattern on appearance
    Vibration.vibrate(
      Platform.OS === 'android' ? [0, 400, 200, 400, 200, 400] : [0, 400, 200, 400]
    );

    // Slide in from bottom with spring
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing animation for accept button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Countdown timer
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          dismiss();
          onDecline(delivery.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      pulse.stop();
    };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = () => {
    dismiss();
    onAccept(delivery.id);
  };

  const handleDecline = () => {
    dismiss();
    onDecline(delivery.id);
  };

  if (!visible) return null;

  const totalPrice =
    delivery.payment.amount +
    (delivery.payment.bonus ?? 0) +
    (delivery.payment.tip ?? 0);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Semi-transparent overlay */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayAnim }]}
        pointerEvents="none"
      />

      {/* Popup card */}
      <Animated.View
        style={[
          styles.popup,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.newDeliveryLabel}>משלוח חדש!</Text>
            <Text style={styles.deliveryType}>
              {DELIVERY_TYPE_LABELS[delivery.type]}
            </Text>
          </View>
          <CircularCountdown seconds={countdown} total={COUNTDOWN_SECONDS} />
        </View>

        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Route info */}
        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>איסוף מ-</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>
                {delivery.business.name}
              </Text>
              <Text style={styles.routeSubAddress} numberOfLines={1}>
                {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
              </Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.decline }]} />
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>מסירה ל-</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>
                {delivery.customer.name}
              </Text>
              <Text style={styles.routeSubAddress} numberOfLines={1}>
                {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{delivery.distance.toFixed(1)} ק"מ</Text>
            <Text style={styles.statLabel}>מרחק</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~{delivery.estimatedDuration} דק'</Text>
            <Text style={styles.statLabel}>זמן משוער</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.goldText]}>
              ₪{totalPrice.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>סה"כ</Text>
          </View>
        </View>

        {/* Price breakdown */}
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>בסיס</Text>
            <Text style={styles.priceValue}>₪{delivery.payment.amount.toFixed(2)}</Text>
          </View>
          {delivery.payment.bonus && delivery.payment.bonus > 0 ? (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, styles.bonusLabel]}>בונוס 🎯</Text>
              <Text style={[styles.priceValue, styles.bonusValue]}>
                +₪{delivery.payment.bonus.toFixed(2)}
              </Text>
            </View>
          ) : null}
          {delivery.payment.tip && delivery.payment.tip > 0 ? (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, styles.tipLabel]}>טיפ 💰</Text>
              <Text style={[styles.priceValue, styles.tipValue]}>
                +₪{delivery.payment.tip.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>סה"כ הכנסה</Text>
            <Text style={styles.totalValue}>₪{totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {delivery.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>📝 {delivery.notes}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <Text style={styles.declineText}>דחה</Text>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.acceptButtonWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptText}>קבל משלוח ✓</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  popup: {
    backgroundColor: '#252636',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.base,
    paddingBottom: Spacing['5xl'],
    paddingHorizontal: Spacing.xl,
    ...Shadows.xl,
    minHeight: SCREEN_HEIGHT * 0.55,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  newDeliveryLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  deliveryType: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Route
  routeSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: Spacing.md,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: 2,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  routeSubAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
    marginBottom: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  goldText: {
    color: '#F6C90E',
  },

  // Price breakdown
  priceBreakdown: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '600',
  },
  bonusLabel: {
    color: '#F6C90E',
  },
  bonusValue: {
    color: '#F6C90E',
    fontWeight: '700',
  },
  tipLabel: {
    color: Colors.available,
  },
  tipValue: {
    color: Colors.available,
    fontWeight: '700',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F6C90E',
  },

  // Notes
  notesBox: {
    backgroundColor: 'rgba(251, 140, 0, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  notesText: {
    fontSize: 14,
    color: Colors.warning,
    lineHeight: 20,
  },

  // Buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  declineButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    minWidth: 90,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  acceptButtonWrapper: {
    flex: 1,
  },
  acceptButton: {
    backgroundColor: Colors.available,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  acceptText: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default DeliveryPopup;
