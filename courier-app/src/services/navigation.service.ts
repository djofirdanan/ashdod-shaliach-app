// ============================================================
// NAVIGATION SERVICE - Google Maps integration
// ============================================================

import { Linking, Platform, Alert } from 'react-native';
import { Coordinates, Address } from '../types';

class NavigationService {
  /**
   * Open Google Maps navigation to an address
   */
  async navigateTo(address: Address): Promise<void> {
    const { coordinates, street, city } = address;
    const label = encodeURIComponent(`${street}, ${city}`);

    let url: string;

    if (Platform.OS === 'ios') {
      // Try Google Maps first, fallback to Apple Maps
      const googleMapsUrl = `comgooglemaps://?daddr=${coordinates.latitude},${coordinates.longitude}&directionsmode=driving`;
      const appleMapsUrl = `maps://app?daddr=${coordinates.latitude},${coordinates.longitude}&q=${label}`;

      const canOpenGoogle = await Linking.canOpenURL(googleMapsUrl);
      url = canOpenGoogle ? googleMapsUrl : appleMapsUrl;
    } else {
      // Android - use Google Maps intent
      url = `google.navigation:q=${coordinates.latitude},${coordinates.longitude}&mode=d`;
    }

    try {
      await Linking.openURL(url);
    } catch {
      // Fallback to browser
      const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;
      await Linking.openURL(browserUrl);
    }
  }

  /**
   * Open navigation to coordinates
   */
  async navigateToCoords(coords: Coordinates, label?: string): Promise<void> {
    const encodedLabel = encodeURIComponent(label || 'יעד');
    let url: string;

    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${coords.latitude},${coords.longitude}&q=${encodedLabel}`;
    } else {
      url = `google.navigation:q=${coords.latitude},${coords.longitude}&mode=d`;
    }

    try {
      await Linking.openURL(url);
    } catch {
      const browserUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
      await Linking.openURL(browserUrl);
    }
  }

  /**
   * Call a phone number
   */
  async callPhone(phone: string): Promise<void> {
    const cleaned = phone.replace(/\s/g, '');
    const url = `tel:${cleaned}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לחייג');
    }
  }

  /**
   * Open Waze navigation
   */
  async openWaze(coords: Coordinates): Promise<void> {
    const url = `waze://?ll=${coords.latitude},${coords.longitude}&navigate=yes`;
    const webUrl = `https://waze.com/ul?ll=${coords.latitude},${coords.longitude}&navigate=yes`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      await Linking.openURL(canOpen ? url : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  }

  /**
   * Get Google Maps static route URL (for map preview)
   */
  getRouteMapUrl(
    origin: Coordinates,
    destination: Coordinates,
    apiKey: string
  ): string {
    return (
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?size=600x300` +
      `&markers=color:green|${origin.latitude},${origin.longitude}` +
      `&markers=color:red|${destination.latitude},${destination.longitude}` +
      `&key=${apiKey}`
    );
  }

  /**
   * Format address for display
   */
  formatAddress(address: Address): string {
    let formatted = `${address.street}, ${address.city}`;
    if (address.floor) {
      formatted += `, קומה ${address.floor}`;
    }
    if (address.apartment) {
      formatted += ` דירה ${address.apartment}`;
    }
    return formatted;
  }

  /**
   * Format short address (street + number only)
   */
  formatShortAddress(address: Address): string {
    return address.street;
  }
}

export const navigationService = new NavigationService();
export default navigationService;
