// ============================================================
// אשדוד-שליח – Maps Service (Google Maps / fallback Haversine)
// ============================================================

import axios from 'axios';
import { GeoPoint, Address } from '../types';
import { haversineDistance, estimateTravelMinutes } from '../utils/helpers';
import logger from '../utils/logger';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';
const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// ─────────────────────────────────────────
// Geocoding
// ─────────────────────────────────────────

export async function geocodeAddress(address: Address): Promise<GeoPoint | null> {
  const addressString = `${address.street}, ${address.city}, ישראל`;
  if (!GOOGLE_API_KEY) {
    logger.warn('GOOGLE_MAPS_API_KEY not set – geocoding skipped');
    return null;
  }

  try {
    const response = await axios.get(GEOCODING_URL, {
      params: { address: addressString, key: GOOGLE_API_KEY, language: 'he' },
      timeout: 5000,
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const loc = response.data.results[0].geometry.location;
      return { latitude: loc.lat, longitude: loc.lng };
    }
    logger.warn(`Geocoding returned status: ${response.data.status} for "${addressString}"`);
    return null;
  } catch (err) {
    logger.error('Geocoding error:', err);
    return null;
  }
}

// ─────────────────────────────────────────
// Distance & Duration
// ─────────────────────────────────────────

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  isFallback: boolean;
}

export async function getRouteInfo(origin: GeoPoint, destination: GeoPoint): Promise<RouteInfo> {
  if (!GOOGLE_API_KEY) {
    const distanceKm = haversineDistance(origin, destination);
    return {
      distanceKm,
      durationMinutes: estimateTravelMinutes(distanceKm),
      isFallback: true,
    };
  }

  try {
    const response = await axios.get(DIRECTIONS_URL, {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        key: GOOGLE_API_KEY,
        mode: 'driving',
        language: 'he',
        region: 'il',
      },
      timeout: 8000,
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const leg = response.data.routes[0].legs[0];
      return {
        distanceKm: leg.distance.value / 1000,
        durationMinutes: Math.ceil(leg.duration.value / 60),
        isFallback: false,
      };
    }

    // Fallback
    const distanceKm = haversineDistance(origin, destination);
    return { distanceKm, durationMinutes: estimateTravelMinutes(distanceKm), isFallback: true };
  } catch (err) {
    logger.error('Directions API error:', err);
    const distanceKm = haversineDistance(origin, destination);
    return { distanceKm, durationMinutes: estimateTravelMinutes(distanceKm), isFallback: true };
  }
}

/**
 * Get distances from one origin to multiple destinations (efficient batch call).
 */
export async function getDistanceMatrix(
  origin: GeoPoint,
  destinations: GeoPoint[]
): Promise<Array<{ distanceKm: number; durationMinutes: number }>> {
  if (!GOOGLE_API_KEY || destinations.length === 0) {
    return destinations.map((d) => {
      const distanceKm = haversineDistance(origin, d);
      return { distanceKm, durationMinutes: estimateTravelMinutes(distanceKm) };
    });
  }

  try {
    const destinationStr = destinations.map((d) => `${d.latitude},${d.longitude}`).join('|');
    const response = await axios.get(DISTANCE_MATRIX_URL, {
      params: {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: destinationStr,
        key: GOOGLE_API_KEY,
        mode: 'driving',
        language: 'he',
        region: 'il',
      },
      timeout: 8000,
    });

    if (response.data.status === 'OK') {
      return response.data.rows[0].elements.map(
        (el: { status: string; distance: { value: number }; duration: { value: number } }) => {
          if (el.status === 'OK') {
            return {
              distanceKm: el.distance.value / 1000,
              durationMinutes: Math.ceil(el.duration.value / 60),
            };
          }
          return { distanceKm: 999, durationMinutes: 999 };
        }
      );
    }
  } catch (err) {
    logger.error('Distance Matrix error:', err);
  }

  // Fallback to Haversine
  return destinations.map((d) => {
    const distanceKm = haversineDistance(origin, d);
    return { distanceKm, durationMinutes: estimateTravelMinutes(distanceKm) };
  });
}

// ─────────────────────────────────────────
// Reverse geocoding
// ─────────────────────────────────────────

export async function reverseGeocode(point: GeoPoint): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;

  try {
    const response = await axios.get(GEOCODING_URL, {
      params: {
        latlng: `${point.latitude},${point.longitude}`,
        key: GOOGLE_API_KEY,
        language: 'he',
      },
      timeout: 5000,
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return response.data.results[0].formatted_address as string;
    }
    return null;
  } catch (err) {
    logger.error('Reverse geocoding error:', err);
    return null;
  }
}

// ─────────────────────────────────────────
// Utility: is a point within radius of another
// ─────────────────────────────────────────

export function isWithinRadius(
  center: GeoPoint,
  point: GeoPoint,
  radiusKm: number
): boolean {
  return haversineDistance(center, point) <= radiusKm;
}
