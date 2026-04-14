// ============================================================
// HOME SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootState, AppDispatch } from '../../store';
import { updateCourierStatus } from '../../store/authSlice';
import {
  setPendingOffer,
  acceptDelivery,
  declineDelivery,
  fetchActiveDeliveries,
} from '../../store/deliverySlice';
import { fetchEarningsSummary } from '../../store/earningsSlice';
import { EarningsCard } from '../../components/delivery/EarningsCard';
import { ActiveDeliveryCard } from '../../components/delivery/ActiveDeliveryCard';
import { DeliveryPopup } from '../../components/delivery/DeliveryPopup';
import { useLocation } from '../../hooks/useLocation';
import { socketService } from '../../services/socket.service';
import { deliveryService } from '../../services/delivery.service';
import { Delivery, MainTabParamList, MainStackParamList } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export const HomeScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<HomeNavProp>();

  const courier = useSelector((s: RootState) => s.auth.courier);
  const { activeDeliveries, pendingOffer } = useSelector((s: RootState) => s.delivery);
  const { summary } = useSelector((s: RootState) => s.earnings);

  const isAvailable = courier?.status === 'available';
  const todayKm = 0; // would come from location tracking totals

  // Start location tracking
  useLocation(true);

  // On mount: load data and setup socket listener
  useEffect(() => {
    dispatch(fetchActiveDeliveries());
    dispatch(fetchEarningsSummary());

    const unsubscribe = socketService.on<Delivery>('delivery:new_offer', (delivery) => {
      dispatch(setPendingOffer(delivery));
    });

    const unsubExpired = socketService.on<string>('delivery:offer_expired', () => {
      dispatch(setPendingOffer(null));
    });

    return () => {
      unsubscribe();
      unsubExpired();
    };
  }, [dispatch]);

  const handleToggleAvailability = useCallback(
    async (value: boolean) => {
      const newStatus = value ? 'available' : 'offline';
      await dispatch(updateCourierStatus(newStatus));
      if (value) {
        socketService.emit('courier:available', {});
      }
    },
    [dispatch]
  );

  const handleAcceptOffer = useCallback(
    async (deliveryId: string) => {
      const result = await dispatch(acceptDelivery(deliveryId));
      if (acceptDelivery.fulfilled.match(result)) {
        navigation.navigate('ActiveDelivery', { deliveryId });
      }
    },
    [dispatch, navigation]
  );

  const handleDeclineOffer = useCallback(
    (deliveryId: string) => {
      dispatch(declineDelivery(deliveryId));
    },
    [dispatch]
  );

  const handleActiveDeliveryPress = (delivery: Delivery) => {
    navigation.navigate('ActiveDelivery', { deliveryId: delivery.id });
  };

  const handleActiveDeliveryAction = (delivery: Delivery) => {
    navigation.navigate('ActiveDelivery', { deliveryId: delivery.id });
  };

  const firstActive = activeDeliveries[0] ?? null;
  const todayEarnings = summary?.today ?? undefined;

  const vehicleIconMap: Record<string, string> = {
    bicycle: '🚲',
    electric_scooter: '🛴',
    motorcycle: '🏍️',
    car: '🚗',
    walking: '🚶',
  };
  const vehicleIcon = courier?.vehicleType ? vehicleIconMap[courier.vehicleType] ?? '🏍️' : '🏍️';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1B2E" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{vehicleIcon}</Text>
          </View>
          <View style={styles.onlineDot} />
        </TouchableOpacity>

        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLabel}>שלום,</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {courier?.name ?? 'שליח'}
          </Text>
        </View>

        <TouchableOpacity style={styles.bellButton}>
          <Ionicons name="notifications-outline" size={24} color={Colors.white} />
          {activeDeliveries.length > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{activeDeliveries.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Availability Toggle Card */}
        <View style={[styles.availabilityCard, isAvailable && styles.availabilityCardActive]}>
          <View style={styles.availabilityLeft}>
            <View style={[styles.availabilityDot, { backgroundColor: isAvailable ? '#00E676' : '#9E9E9E' }]} />
            <View>
              <Text style={styles.availabilityTitle}>
                {isAvailable ? 'זמין למשלוחים' : 'לא זמין'}
              </Text>
              <Text style={styles.availabilitySubtitle}>
                {isAvailable ? 'מקבל הצעות משלוח חדשות' : 'לא מקבל הצעות כרגע'}
              </Text>
            </View>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: '#3D3E50', true: 'rgba(0,230,118,0.3)' }}
            thumbColor={isAvailable ? '#00E676' : '#9E9E9E'}
            ios_backgroundColor="#3D3E50"
          />
        </View>

        {/* Earnings Card */}
        <EarningsCard
          earnings={todayEarnings}
          totalDeliveries={activeDeliveries.length}
          totalKm={todayKm}
          onPress={() => navigation.navigate('Earnings')}
        />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={22} color="#6C63FF" />
            <Text style={styles.statValue}>{summary?.today.deliveries ?? 0}</Text>
            <Text style={styles.statLabel}>משלוחים היום</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="navigate-outline" size={22} color="#6C63FF" />
            <Text style={styles.statValue}>{todayKm.toFixed(1)}</Text>
            <Text style={styles.statLabel}>ק"מ היום</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={22} color="#F6C90E" />
            <Text style={styles.statValue}>{courier?.rating.toFixed(1) ?? '5.0'}</Text>
            <Text style={styles.statLabel}>דירוג</Text>
          </View>
        </View>

        {/* Active Delivery */}
        {firstActive && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>משלוח פעיל</Text>
            <ActiveDeliveryCard
              delivery={firstActive}
              onActionPress={handleActiveDeliveryAction}
              onPress={handleActiveDeliveryPress}
            />
          </View>
        )}

        {/* Idle state */}
        {!firstActive && isAvailable && (
          <View style={styles.idleState}>
            <Text style={styles.idleIcon}>📡</Text>
            <Text style={styles.idleTitle}>מחפש משלוחים...</Text>
            <Text style={styles.idleSubtitle}>
              תקבל התראה כשיהיה משלוח זמין באזורך
            </Text>
          </View>
        )}

        {!firstActive && !isAvailable && (
          <View style={styles.idleState}>
            <Text style={styles.idleIcon}>💤</Text>
            <Text style={styles.idleTitle}>במצב לא זמין</Text>
            <Text style={styles.idleSubtitle}>
              הפעל את הזמינות כדי להתחיל לקבל משלוחים
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Delivery Offer Popup */}
      {pendingOffer && (
        <DeliveryPopup
          delivery={pendingOffer}
          visible={!!pendingOffer}
          onAccept={handleAcceptOffer}
          onDecline={handleDeclineOffer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 56,
    paddingBottom: Spacing.base,
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#252636',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  avatarText: {
    fontSize: 22,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00E676',
    borderWidth: 2,
    borderColor: '#1A1B2E',
  },
  greetingBlock: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#252636',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
    gap: Spacing.base,
  },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Shadows.md,
  },
  availabilityCardActive: {
    borderColor: 'rgba(0,230,118,0.3)',
    backgroundColor: 'rgba(0,230,118,0.06)',
  },
  availabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  availabilityDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  availabilitySubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statCard: {
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
  },
  idleState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  idleIcon: {
    fontSize: 52,
  },
  idleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  idleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});

export default HomeScreen;
