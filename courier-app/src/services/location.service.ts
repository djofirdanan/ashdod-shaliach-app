// ============================================================
// LOCATION SERVICE - Background tracking - אשדוד-שליח
// ============================================================

import * as Location from 'expo-location';
import { apiService } from './api.service';
import { Coordinates } from '../types';

const LOCATION_TASK_NAME = 'background-location-task';
const UPDATE_INTERVAL_MS = 15000; // 15 seconds

class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private lastLocation: Coordinates | null = null;
  private onLocationUpdate: ((location: Coordinates) => void) | null = null;

  /**
   * Request all necessary location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied');
        // Still return true - foreground tracking is acceptable
      }

      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<Coordinates | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Get current location error:', error);
      return null;
    }
  }

  /**
   * Start tracking location (foreground)
   */
  async startTracking(
    onUpdate: (location: Coordinates) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      this.onLocationUpdate = onUpdate;

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const coords: Coordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          this.lastLocation = coords;
          this.onLocationUpdate?.(coords);
        }
      );

      // Start server update interval (every 15 seconds)
      this.updateInterval = setInterval(async () => {
        if (this.lastLocation) {
          await this.sendLocationToServer(this.lastLocation);
        }
      }, UPDATE_INTERVAL_MS);

      return true;
    } catch (error) {
      console.error('Start tracking error:', error);
      return false;
    }
  }

  /**
   * Stop all location tracking
   */
  async stopTracking(): Promise<void> {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.onLocationUpdate = null;
  }

  /**
   * Send location update to server
   */
  private async sendLocationToServer(location: Coordinates): Promise<void> {
    try {
      await apiService.post('/courier/location', {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Silent fail - don't interrupt courier experience
      console.warn('Failed to send location to server:', error);
    }
  }

  /**
   * Send emergency SOS with location
   */
  async sendEmergencyAlert(type: 'sos' | 'accident' | 'threat'): Promise<void> {
    const location = this.lastLocation || (await this.getCurrentLocation());
    if (!location) throw new Error('לא ניתן לקבל מיקום');

    await apiService.post('/courier/emergency', {
      type,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get last known location
   */
  getLastLocation(): Coordinates | null {
    return this.lastLocation;
  }

  /**
   * Check if actively tracking
   */
  isTracking(): boolean {
    return this.watchSubscription !== null;
  }
}

export const locationService = new LocationService();
export default locationService;
