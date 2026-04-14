// ============================================================
// NAVIGATION MAP - אשדוד-שליח Courier App
// ============================================================

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme';
import { Coordinates, Delivery } from '../../types';

interface NavigationMapProps {
  currentLocation: Coordinates | null;
  delivery?: Delivery | null;
  style?: ViewStyle;
  showCenterButton?: boolean;
  onMapReady?: () => void;
}

// Default center: Ashdod, Israel
const ASHDOD_CENTER: Region = {
  latitude: 31.8014,
  longitude: 34.6436,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const NavigationMap: React.FC<NavigationMapProps> = ({
  currentLocation,
  delivery,
  style,
  showCenterButton = true,
  onMapReady,
}) => {
  const mapRef = useRef<MapView>(null);

  const centerOnCourier = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }, [currentLocation]);

  // Fit map to show all relevant markers
  const fitToMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const coordinates: Coordinates[] = [];
    if (currentLocation) coordinates.push(currentLocation);
    if (delivery?.pickupAddress.coordinates) coordinates.push(delivery.pickupAddress.coordinates);
    if (delivery?.deliveryAddress.coordinates)
      coordinates.push(delivery.deliveryAddress.coordinates);

    if (coordinates.length > 1) {
      mapRef.current.fitToCoordinates(
        coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
        {
          edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
          animated: true,
        }
      );
    } else if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
  }, [currentLocation, delivery]);

  useEffect(() => {
    const timeout = setTimeout(fitToMarkers, 800);
    return () => clearTimeout(timeout);
  }, [fitToMarkers]);

  const initialRegion: Region = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }
    : ASHDOD_CENTER;

  // Build route polyline coordinates
  const routeCoordinates = [];
  if (currentLocation) routeCoordinates.push(currentLocation);
  if (delivery?.pickupAddress.coordinates)
    routeCoordinates.push(delivery.pickupAddress.coordinates);
  if (delivery?.deliveryAddress.coordinates)
    routeCoordinates.push(delivery.deliveryAddress.coordinates);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        showsScale={false}
        mapType="standard"
        onMapReady={onMapReady}
      >
        {/* Courier location marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="המיקום שלי"
            zIndex={10}
          >
            <View style={styles.courierMarker}>
              <Text style={styles.courierMarkerText}>🏍️</Text>
            </View>
          </Marker>
        )}

        {/* Pickup marker (blue) */}
        {delivery?.pickupAddress.coordinates && (
          <Marker
            coordinate={{
              latitude: delivery.pickupAddress.coordinates.latitude,
              longitude: delivery.pickupAddress.coordinates.longitude,
            }}
            title={delivery.business.name}
            description={delivery.pickupAddress.street}
            zIndex={8}
          >
            <View style={[styles.markerPin, styles.pickupMarker]}>
              <Text style={styles.markerIcon}>🏪</Text>
              <View style={[styles.markerTail, styles.pickupTail]} />
            </View>
          </Marker>
        )}

        {/* Delivery marker (red) */}
        {delivery?.deliveryAddress.coordinates && (
          <Marker
            coordinate={{
              latitude: delivery.deliveryAddress.coordinates.latitude,
              longitude: delivery.deliveryAddress.coordinates.longitude,
            }}
            title={delivery.customer.name}
            description={delivery.deliveryAddress.street}
            zIndex={8}
          >
            <View style={[styles.markerPin, styles.deliveryMarker]}>
              <Text style={styles.markerIcon}>🏠</Text>
              <View style={[styles.markerTail, styles.deliveryTail]} />
            </View>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates.map((c) => ({
              latitude: c.latitude,
              longitude: c.longitude,
            }))}
            strokeColor={Colors.primary}
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      {/* Center on courier button */}
      {showCenterButton && (
        <TouchableOpacity
          style={styles.centerButton}
          onPress={centerOnCourier}
          activeOpacity={0.8}
        >
          <Text style={styles.centerButtonIcon}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Fit all button */}
      {delivery && (
        <TouchableOpacity
          style={[styles.centerButton, styles.fitButton]}
          onPress={fitToMarkers}
          activeOpacity={0.8}
        >
          <Text style={styles.centerButtonIcon}>🗺️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Courier marker
  courierMarker: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.md,
  },
  courierMarkerText: {
    fontSize: 20,
  },

  // Pin markers
  markerPin: {
    alignItems: 'center',
    ...Shadows.md,
  },
  pickupMarker: {},
  deliveryMarker: {},
  markerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  markerIcon: {
    fontSize: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 4,
    overflow: 'hidden',
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    marginTop: -2,
  },
  pickupTail: {
    borderTopColor: Colors.primary,
  },
  deliveryTail: {
    borderTopColor: Colors.decline,
  },

  // Buttons
  centerButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.base,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fitButton: {
    bottom: Spacing.lg + 56,
  },
  centerButtonIcon: {
    fontSize: 22,
  },
});

export default NavigationMap;
