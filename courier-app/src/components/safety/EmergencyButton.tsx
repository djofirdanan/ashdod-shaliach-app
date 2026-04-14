// ============================================================
// EMERGENCY BUTTON - אשדוד-שליח Courier App
// ============================================================

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Vibration,
  Alert,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme';

interface EmergencyButtonProps {
  courierId?: string;
  onAlert?: (location: { latitude: number; longitude: number }) => void;
}

const HOLD_DURATION = 3000; // 3 seconds

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  courierId,
  onAlert,
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartTime = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = useCallback(() => {
    setIsHolding(true);
    holdStartTime.current = Date.now();
    setProgress(0);

    Vibration.vibrate(50);

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    // Progress tracking
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTime.current;
      const pct = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(pct);

      if (pct >= 1) {
        cancelHold();
        triggerSOS();
      }
    }, 50);
  }, []);

  const cancelHold = useCallback(() => {
    setIsHolding(false);
    setProgress(0);

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
    glowAnim.stopAnimation();
    Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, []);

  const triggerSOS = useCallback(async () => {
    Vibration.vibrate(
      Platform.OS === 'android' ? [0, 200, 100, 200, 100, 400] : [0, 200, 100, 200]
    );

    let location = { latitude: 0, longitude: 0 };
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      // proceed without location
    }

    onAlert?.(location);
    setShowConfirm(true);

    // Auto-dismiss confirmation after 5 seconds
    setTimeout(() => setShowConfirm(false), 5000);
  }, [onAlert]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <>
      <View style={styles.container}>
        {/* Animated glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowOpacity,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          pointerEvents="none"
        />

        {/* Progress ring overlay */}
        {isHolding && (
          <View style={[styles.progressRing, { opacity: 0.8 }]}>
            <View
              style={[
                styles.progressArc,
                { transform: [{ rotate: `${progress * 360}deg` }] },
              ]}
            />
          </View>
        )}

        {/* The actual button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.button, isHolding && styles.buttonActive]}
            onPressIn={startHold}
            onPressOut={cancelHold}
            activeOpacity={1}
          >
            <Text style={styles.buttonIcon}>🆘</Text>
            <Text style={styles.buttonLabel}>SOS</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hold instruction */}
        {isHolding && (
          <View style={styles.holdIndicator}>
            <Text style={styles.holdText}>
              {Math.ceil(HOLD_DURATION / 1000 - (progress * HOLD_DURATION) / 1000)} שנ'...
            </Text>
          </View>
        )}
      </View>

      {/* Confirmation modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmIcon}>🆘</Text>
            <Text style={styles.confirmTitle}>קריאת מצוקה נשלחה!</Text>
            <Text style={styles.confirmBody}>
              המיקום שלך נשלח לצוות התמיכה.{'\n'}
              יצרו איתך קשר בהקדם.
            </Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowConfirm(false)}
            >
              <Text style={styles.confirmButtonText}>הבנתי</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const BUTTON_SIZE = 64;
const GLOW_SIZE = BUTTON_SIZE + 24;

const styles = StyleSheet.create({
  container: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: Colors.emergency,
  },
  progressRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 8,
    height: BUTTON_SIZE + 8,
    borderRadius: (BUTTON_SIZE + 8) / 2,
    borderWidth: 3,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  progressArc: {
    position: 'absolute',
    width: '100%',
    height: '50%',
    top: 0,
    backgroundColor: Colors.emergency,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Colors.emergency,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  buttonActive: {
    backgroundColor: '#B71C1C',
    borderColor: Colors.white,
  },
  buttonIcon: {
    fontSize: 24,
  },
  buttonLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1,
    marginTop: -2,
  },
  holdIndicator: {
    position: 'absolute',
    top: BUTTON_SIZE + 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  holdText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: '700',
  },

  // Confirm modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    width: '80%',
    borderWidth: 3,
    borderColor: Colors.emergency,
    ...Shadows.xl,
  },
  confirmIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.emergency,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default EmergencyButton;
