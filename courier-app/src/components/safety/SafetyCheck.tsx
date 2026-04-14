// ============================================================
// SAFETY CHECK - אשדוד-שליח Courier App
// Night delivery safety check modal
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

interface SafetyCheckProps {
  visible: boolean;
  onConfirmOk: () => void;
  onConfirmNotOk: () => void;
  onAutoAlert?: () => void;
  timeoutSeconds?: number;
}

const DEFAULT_TIMEOUT = 300; // 5 minutes

export const SafetyCheck: React.FC<SafetyCheckProps> = ({
  visible,
  onConfirmOk,
  onConfirmNotOk,
  onAutoAlert,
  timeoutSeconds = DEFAULT_TIMEOUT,
}) => {
  const [countdown, setCountdown] = useState(timeoutSeconds);
  const [hasAlerted, setHasAlerted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(timeoutSeconds);
      setHasAlerted(false);
      return;
    }

    // Vibrate to get attention
    Vibration.vibrate(
      Platform.OS === 'android' ? [0, 500, 300, 500] : [0, 500, 300, 500]
    );

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Countdown timer
    setCountdown(timeoutSeconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!hasAlerted) {
            setHasAlerted(true);
            // Shake animation as alert
            Animated.sequence([
              Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
            Vibration.vibrate(
              Platform.OS === 'android'
                ? [0, 800, 200, 800, 200, 800]
                : [0, 800, 200, 800]
            );
            onAutoAlert?.();
          }
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

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const urgencyColor =
    countdown > 60 ? Colors.primary : countdown > 30 ? Colors.warning : Colors.decline;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirmOk}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {/* Icon */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🌙</Text>
            </View>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>בדיקת בטיחות</Text>
          <Text style={styles.subtitle}>האם הכל בסדר?</Text>

          <Text style={styles.description}>
            אנחנו דואגים לך!{'\n'}
            אנא אשר שאתה בסדר להמשך הנסיעה.
          </Text>

          {/* Countdown */}
          {countdown > 0 ? (
            <View style={[styles.countdownContainer, { borderColor: urgencyColor }]}>
              <Text style={[styles.countdownText, { color: urgencyColor }]}>
                {formatTime(countdown)}
              </Text>
              <Text style={styles.countdownLabel}>לפני שנשלח התראה</Text>
            </View>
          ) : (
            <View style={[styles.countdownContainer, { borderColor: Colors.emergency }]}>
              <Text style={[styles.countdownText, { color: Colors.emergency }]}>🆘</Text>
              <Text style={[styles.countdownLabel, { color: Colors.emergency }]}>
                התראה נשלחה לצוות
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.notOkButton}
              onPress={onConfirmNotOk}
              activeOpacity={0.85}
            >
              <Text style={styles.notOkText}>❌ לא בסדר</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.okButton}
              onPress={onConfirmOk}
              activeOpacity={0.85}
            >
              <Text style={styles.okText}>✓ הכל בסדר!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: '#1E1F30',
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26,115,232,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  countdownContainer: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    minWidth: 140,
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '900',
  },
  countdownLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  notOkButton: {
    flex: 1,
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.decline,
  },
  notOkText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.decline,
  },
  okButton: {
    flex: 2,
    backgroundColor: Colors.available,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  okText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
});

export default SafetyCheck;
