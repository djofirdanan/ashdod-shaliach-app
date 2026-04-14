// ============================================================
// ACTIVE DELIVERY SCREEN - אשדוד-שליח Courier App
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store';
import {
  updateDeliveryStatus,
  submitProofOfDelivery,
  removeActiveDelivery,
} from '../../store/deliverySlice';
import { NavigationMap } from '../../components/map/NavigationMap';
import { RouteOverlay } from '../../components/map/RouteOverlay';
import { DeliveryRouteCard } from '../../components/delivery/DeliveryRouteCard';
import { ProofOfDelivery as ProofOfDeliveryModal } from '../../components/delivery/ProofOfDelivery';
import { EmergencyButton } from '../../components/safety/EmergencyButton';
import { MainStackParamList, ProofOfDelivery } from '../../types';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';

type ActiveDeliveryScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ActiveDelivery'>;
  route: RouteProp<MainStackParamList, 'ActiveDelivery'>;
};

export const ActiveDeliveryScreen: React.FC<ActiveDeliveryScreenProps> = ({
  navigation,
  route,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { deliveryId } = route.params;

  const delivery = useSelector((s: RootState) =>
    s.delivery.activeDeliveries.find((d) => d.id === deliveryId)
  );
  const currentLocation = useSelector((s: RootState) => s.location.currentLocation);
  const courier = useSelector((s: RootState) => s.auth.courier);

  const [showProof, setShowProof] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!delivery) {
      navigation.goBack();
    }
  }, [delivery, navigation]);

  const handleArrivedAtPickup = useCallback(async () => {
    if (!delivery) return;
    setIsActionLoading(true);
    await dispatch(updateDeliveryStatus({ deliveryId: delivery.id, status: 'at_pickup' }));
    setIsActionLoading(false);
  }, [delivery, dispatch]);

  const handlePickedUp = useCallback(async () => {
    if (!delivery) return;
    setIsActionLoading(true);
    await dispatch(updateDeliveryStatus({ deliveryId: delivery.id, status: 'picked_up' }));
    setIsActionLoading(false);
  }, [delivery, dispatch]);

  const handleDelivered = useCallback(() => {
    setShowProof(true);
  }, []);

  const handleSubmitProof = useCallback(
    async (proof: ProofOfDelivery) => {
      if (!delivery) return;
      await dispatch(submitProofOfDelivery({ deliveryId: delivery.id, proof }));
      await dispatch(updateDeliveryStatus({ deliveryId: delivery.id, status: 'delivered' }));
      setShowProof(false);
      dispatch(removeActiveDelivery(delivery.id));
      Alert.alert('המשלוח הושלם!', 'כל הכבוד! המשלוח נמסר בהצלחה.', [
        { text: 'אחלה', onPress: () => navigation.goBack() },
      ]);
    },
    [delivery, dispatch, navigation]
  );

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openChat = () => {
    if (!delivery) return;
    navigation.navigate('Chat', {
      deliveryId: delivery.id,
      recipientName: delivery.business.name,
    });
  };

  if (!delivery) return null;

  const renderActionPanel = () => {
    switch (delivery.status) {
      case 'accepted':
      case 'going_to_pickup':
        return (
          <View style={styles.actionPanel}>
            <Text style={styles.panelTitle}>בדרך לאיסוף</Text>
            <DeliveryRouteCard delivery={delivery} compact />
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={handleArrivedAtPickup}
              disabled={isActionLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="location" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>הגעתי לעסק</Text>
            </TouchableOpacity>
          </View>
        );

      case 'at_pickup':
        return (
          <View style={styles.actionPanel}>
            <Text style={styles.panelTitle}>באיסוף - {delivery.business.name}</Text>
            <View style={styles.businessCard}>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{delivery.business.name}</Text>
                <Text style={styles.businessAddress}>
                  {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => callPhone(delivery.business.phone)}
              >
                <Ionicons name="call" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
            {delivery.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>📝 {delivery.notes}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
              onPress={handlePickedUp}
              disabled={isActionLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="cube" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>אספתי את החבילה</Text>
            </TouchableOpacity>
          </View>
        );

      case 'picked_up':
      case 'going_to_delivery':
        return (
          <View style={styles.actionPanel}>
            <Text style={styles.panelTitle}>בדרך למסירה</Text>
            <DeliveryRouteCard delivery={delivery} compact />
            <View style={styles.customerCard}>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{delivery.customer.name}</Text>
                <Text style={styles.businessAddress}>
                  {delivery.deliveryAddress.street}
                  {delivery.deliveryAddress.floor
                    ? `, קומה ${delivery.deliveryAddress.floor}`
                    : ''}
                  {delivery.deliveryAddress.apartment
                    ? ` דירה ${delivery.deliveryAddress.apartment}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => callPhone(delivery.customer.phone)}
              >
                <Ionicons name="call" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.available }]}
              onPress={handleDelivered}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>מסרתי את החבילה</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={styles.actionPanel}>
            <Text style={styles.panelTitle}>סטטוס: {delivery.status}</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Map - top 55% */}
      <View style={styles.mapContainer}>
        <NavigationMap
          currentLocation={currentLocation}
          delivery={delivery}
          showCenterButton
          style={StyleSheet.absoluteFillObject}
        />

        {/* Header overlay */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-forward" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>משלוח פעיל</Text>
          <View style={styles.orderBadge}>
            <Text style={styles.orderNumber}>#{delivery.orderNumber}</Text>
          </View>
        </View>

        {/* Route overlay */}
        <RouteOverlay
          distanceRemaining={delivery.distance}
          etaMinutes={delivery.estimatedDuration}
          destinationName={
            delivery.status === 'picked_up' || delivery.status === 'going_to_delivery'
              ? delivery.deliveryAddress.street
              : delivery.pickupAddress.street
          }
        />

        {/* FAB buttons */}
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.chatFab} onPress={openChat} activeOpacity={0.85}>
            <Ionicons name="chatbubble" size={22} color={Colors.white} />
          </TouchableOpacity>
          <EmergencyButton courierId={courier?.id} />
        </View>
      </View>

      {/* Action panel - bottom 45% */}
      <ScrollView
        style={styles.bottomPanel}
        contentContainerStyle={styles.bottomPanelContent}
        showsVerticalScrollIndicator={false}
      >
        {renderActionPanel()}
      </ScrollView>

      {/* Proof of delivery modal */}
      <ProofOfDeliveryModal
        visible={showProof}
        deliveryId={delivery.id}
        onSubmit={handleSubmitProof}
        onClose={() => setShowProof(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  mapContainer: {
    height: '55%',
    position: 'relative',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(26,27,46,0.85)',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'right',
  },
  orderBadge: {
    backgroundColor: '#252636',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    alignItems: 'flex-end',
  },
  chatFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  bottomPanel: {
    flex: 1,
    backgroundColor: '#1A1B2E',
  },
  bottomPanelContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  actionPanel: {
    gap: Spacing.md,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'right',
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252636',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'right',
  },
  businessAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    textAlign: 'right',
  },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.available,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesBox: {
    backgroundColor: 'rgba(251,140,0,0.12)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  notesText: {
    fontSize: 13,
    color: Colors.warning,
    lineHeight: 20,
    textAlign: 'right',
  },
  actionButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});

export default ActiveDeliveryScreen;
