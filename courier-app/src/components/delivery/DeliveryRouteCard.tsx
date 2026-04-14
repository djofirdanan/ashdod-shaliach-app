// ============================================================
// DELIVERY ROUTE CARD - אשדוד-שליח Courier App
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../theme';
import { Delivery } from '../../types';

interface DeliveryRouteCardProps {
  delivery: Delivery;
  compact?: boolean;
}

export const DeliveryRouteCard: React.FC<DeliveryRouteCardProps> = ({
  delivery,
  compact = false,
}) => {
  const openGoogleMaps = (
    address: string,
    lat?: number,
    lng?: number
  ) => {
    const encodedAddress = encodeURIComponent(address);
    let url: string;

    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        // Fallback to waze
        const wazeUrl = `waze://?q=${encodedAddress}&navigate=yes`;
        return Linking.openURL(wazeUrl).catch(() => {
          Alert.alert('שגיאה', 'לא ניתן לפתוח ניווט. אנא התקן את Google Maps.');
        });
      })
      .catch(() => {
        Alert.alert('שגיאה', 'לא ניתן לפתוח ניווט.');
      });
  };

  const navigateToPickup = () => {
    const address = `${delivery.pickupAddress.street}, ${delivery.pickupAddress.city}`;
    openGoogleMaps(
      address,
      delivery.pickupAddress.coordinates.latitude,
      delivery.pickupAddress.coordinates.longitude
    );
  };

  const navigateToDelivery = () => {
    const address = `${delivery.deliveryAddress.street}, ${delivery.deliveryAddress.city}`;
    openGoogleMaps(
      address,
      delivery.deliveryAddress.coordinates.latitude,
      delivery.deliveryAddress.coordinates.longitude
    );
  };

  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactRow}>
          <View style={[styles.compactDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.compactAddress} numberOfLines={1}>
            {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
          </Text>
          <TouchableOpacity onPress={navigateToPickup} style={styles.navButton}>
            <Text style={styles.navButtonText}>נווט</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.compactDivider} />
        <View style={styles.compactRow}>
          <View style={[styles.compactDot, { backgroundColor: Colors.decline }]} />
          <Text style={styles.compactAddress} numberOfLines={1}>
            {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
          </Text>
          <TouchableOpacity onPress={navigateToDelivery} style={styles.navButton}>
            <Text style={styles.navButtonText}>נווט</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>מסלול משלוח</Text>

      {/* Distance + ETA summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>📍</Text>
          <Text style={styles.summaryValue}>{delivery.distance.toFixed(1)} ק"מ</Text>
          <Text style={styles.summaryLabel}>מרחק כולל</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>⏱️</Text>
          <Text style={styles.summaryValue}>~{delivery.estimatedDuration} דק'</Text>
          <Text style={styles.summaryLabel}>זמן משוער</Text>
        </View>
      </View>

      {/* FROM */}
      <View style={styles.stopCard}>
        <View style={styles.stopHeader}>
          <View style={[styles.stopIndicator, { backgroundColor: Colors.primary }]}>
            <Text style={styles.stopIndicatorText}>א</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopRole}>איסוף מ-</Text>
            <Text style={styles.stopName}>{delivery.business.name}</Text>
          </View>
        </View>
        <Text style={styles.stopAddress}>
          {delivery.pickupAddress.street}
          {delivery.pickupAddress.floor ? `, קומה ${delivery.pickupAddress.floor}` : ''}
          {delivery.pickupAddress.apartment ? ` דירה ${delivery.pickupAddress.apartment}` : ''}
        </Text>
        <Text style={styles.stopCity}>{delivery.pickupAddress.city}</Text>
        {delivery.pickupAddress.notes ? (
          <Text style={styles.stopNotes}>💡 {delivery.pickupAddress.notes}</Text>
        ) : null}
        <TouchableOpacity style={styles.navigateButton} onPress={navigateToPickup}>
          <Text style={styles.navigateButtonText}>🗺️ נווט לאיסוף</Text>
        </TouchableOpacity>
      </View>

      {/* Route line */}
      <View style={styles.routeConnector}>
        <View style={styles.connectorLine} />
        <View style={styles.connectorArrow}>
          <Text style={styles.arrowText}>↓</Text>
        </View>
        <View style={styles.connectorLine} />
      </View>

      {/* TO */}
      <View style={styles.stopCard}>
        <View style={styles.stopHeader}>
          <View style={[styles.stopIndicator, { backgroundColor: Colors.decline }]}>
            <Text style={styles.stopIndicatorText}>ב</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopRole}>מסירה ל-</Text>
            <Text style={styles.stopName}>{delivery.customer.name}</Text>
          </View>
        </View>
        <Text style={styles.stopAddress}>
          {delivery.deliveryAddress.street}
          {delivery.deliveryAddress.floor ? `, קומה ${delivery.deliveryAddress.floor}` : ''}
          {delivery.deliveryAddress.apartment ? ` דירה ${delivery.deliveryAddress.apartment}` : ''}
        </Text>
        <Text style={styles.stopCity}>{delivery.deliveryAddress.city}</Text>
        {delivery.deliveryAddress.notes ? (
          <Text style={styles.stopNotes}>💡 {delivery.deliveryAddress.notes}</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.navigateButton, { backgroundColor: Colors.decline }]}
          onPress={navigateToDelivery}
        >
          <Text style={styles.navigateButtonText}>🗺️ נווט למסירה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  stopCard: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stopIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  stopIndicatorText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  stopInfo: {
    flex: 1,
  },
  stopRole: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  stopName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stopAddress: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stopCity: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  stopNotes: {
    fontSize: 13,
    color: Colors.warning,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  navigateButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  navigateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  routeConnector: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  connectorLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.border,
  },
  connectorArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Compact
  compactCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  compactDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  compactAddress: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  navButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  compactDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
    marginLeft: 18,
  },
});

export default DeliveryRouteCard;
