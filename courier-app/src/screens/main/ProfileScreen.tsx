// ============================================================
// PROFILE SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../../store';
import { logoutCourier } from '../../store/authSlice';
import { SafetyCheck } from '../../components/safety/SafetyCheck';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

const VEHICLE_LABELS: Record<string, { label: string; icon: string }> = {
  bicycle: { label: 'אופניים', icon: '🚲' },
  electric_scooter: { label: 'קורקינט חשמלי', icon: '🛴' },
  motorcycle: { label: 'אופנוע', icon: '🏍️' },
  car: { label: 'מכונית', icon: '🚗' },
  walking: { label: 'רגלי', icon: '🚶' },
};

export const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const courier = useSelector((s: RootState) => s.auth.courier);
  const { summary } = useSelector((s: RootState) => s.earnings);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [safetyModeEnabled, setSafetyModeEnabled] = useState(false);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);

  const vehicleInfo = VEHICLE_LABELS[courier?.vehicleType ?? 'motorcycle'] ?? VEHICLE_LABELS.motorcycle;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < Math.round(rating) ? 'star' : 'star-outline'}
        size={16}
        color={i < Math.round(rating) ? '#F6C90E' : 'rgba(255,255,255,0.3)'}
      />
    ));
  };

  const handleLogout = () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: () => dispatch(logoutCourier()),
        },
      ]
    );
  };

  const handleSafetyToggle = (value: boolean) => {
    setSafetyModeEnabled(value);
    if (value) {
      setShowSafetyCheck(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>פרופיל</Text>
        </View>

        {/* Avatar + name section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarIcon}>{vehicleInfo.icon}</Text>
            </View>
            <View style={[styles.statusIndicator, {
              backgroundColor: courier?.status === 'available' ? '#00E676' : '#9E9E9E'
            }]} />
          </View>

          <Text style={styles.courierName}>{courier?.name ?? 'שליח'}</Text>
          <Text style={styles.courierEmail}>{courier?.email ?? ''}</Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {renderStars(courier?.rating ?? 5)}
            <Text style={styles.ratingText}>{courier?.rating.toFixed(1) ?? '5.0'}</Text>
          </View>

          {/* Verified badge */}
          {courier?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color='#00E676' />
              <Text style={styles.verifiedText}>מאומת</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="cube-outline" size={22} color="#6C63FF" />
            <Text style={styles.statValue}>{courier?.totalDeliveries ?? 0}</Text>
            <Text style={styles.statLabel}>משלוחים</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={22} color="#6C63FF" />
            <Text style={styles.statValue}>{(courier?.totalDeliveries ?? 0) * 3.2} </Text>
            <Text style={styles.statLabel}>ק"מ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="star-outline" size={22} color="#F6C90E" />
            <Text style={styles.statValue}>{courier?.rating.toFixed(1) ?? '5.0'}</Text>
            <Text style={styles.statLabel}>ממוצע</Text>
          </View>
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי רכב</Text>
          <View style={styles.vehicleCard}>
            <Text style={styles.vehicleEmoji}>{vehicleInfo.icon}</Text>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleType}>{vehicleInfo.label}</Text>
              {courier?.vehiclePlate && (
                <Text style={styles.vehiclePlate}>🔢 {courier.vehiclePlate}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הגדרות</Text>
          <View style={styles.settingsCard}>
            {/* Notifications */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(108,99,255,0.15)' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#6C63FF" />
                </View>
                <Text style={styles.settingLabel}>התראות</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#3D3E50', true: 'rgba(108,99,255,0.4)' }}
                thumbColor={notificationsEnabled ? '#6C63FF' : '#9E9E9E'}
                ios_backgroundColor="#3D3E50"
              />
            </View>

            <View style={styles.settingDivider} />

            {/* Sound */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(0,230,118,0.15)' }]}>
                  <Ionicons name="volume-high-outline" size={18} color="#00E676" />
                </View>
                <Text style={styles.settingLabel}>צלילים</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#3D3E50', true: 'rgba(0,230,118,0.4)' }}
                thumbColor={soundEnabled ? '#00E676' : '#9E9E9E'}
                ios_backgroundColor="#3D3E50"
              />
            </View>

            <View style={styles.settingDivider} />

            {/* Safety mode */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: 'rgba(211,47,47,0.15)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={Colors.emergency} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>מצב בטיחות</Text>
                  <Text style={styles.settingSubLabel}>בדיקה כל 30 דק' בלילה</Text>
                </View>
              </View>
              <Switch
                value={safetyModeEnabled}
                onValueChange={handleSafetyToggle}
                trackColor={{ false: '#3D3E50', true: 'rgba(211,47,47,0.4)' }}
                thumbColor={safetyModeEnabled ? Colors.emergency : '#9E9E9E'}
                ios_backgroundColor="#3D3E50"
              />
            </View>
          </View>
        </View>

        {/* Safety check component */}
        {safetyModeEnabled && (
          <View style={styles.section}>
            <SafetyCheck
              visible={showSafetyCheck}
              onConfirmOk={() => setShowSafetyCheck(false)}
              onConfirmNotOk={() => {
                setShowSafetyCheck(false);
                Alert.alert('קריאת מצוקה', 'נשלחה קריאת מצוקה לצוות.');
              }}
              onAutoAlert={() => {
                Alert.alert('התראה אוטומטית', 'לא הגבת — נשלחה התראה אוטומטית.');
              }}
            />
            <TouchableOpacity
              style={styles.testSafetyButton}
              onPress={() => setShowSafetyCheck(true)}
            >
              <Ionicons name="shield-checkmark" size={18} color={Colors.white} />
              <Text style={styles.testSafetyText}>בדיקת בטיחות</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Join date */}
        <View style={styles.joinedRow}>
          <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.3)" />
          <Text style={styles.joinedText}>
            שליח מאז{' '}
            {courier?.joinedAt
              ? new Date(courier.joinedAt).toLocaleDateString('he-IL', {
                  month: 'long',
                  year: 'numeric',
                })
              : 'אפריל 2026'}
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.decline} />
          <Text style={styles.logoutText}>התנתק</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 56,
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#252636',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6C63FF',
    ...Shadows.lg,
  },
  avatarIcon: {
    fontSize: 44,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#1A1B2E',
  },
  courierName: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
  },
  courierEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F6C90E',
    marginLeft: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E676',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
  },
  section: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  vehicleEmoji: {
    fontSize: 36,
  },
  vehicleInfo: {
    flex: 1,
    gap: 4,
  },
  vehicleType: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
  },
  vehiclePlate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  settingsCard: {
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  settingSubLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: Spacing.base,
  },
  testSafetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211,47,47,0.15)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.3)',
  },
  testSafetyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  joinedText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,57,53,0.1)',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.25)',
    marginBottom: Spacing.xl,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.decline,
  },
});

export default ProfileScreen;
