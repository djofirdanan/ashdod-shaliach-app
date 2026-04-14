// ============================================================
// DISTANCE UTILS - אשדוד-שליח Courier App
// ============================================================

import { Coordinates } from '../types';

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bearing from one coordinate to another (in degrees, 0=North)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = Math.atan2(y, x);
  return ((bearing * 180) / Math.PI + 360) % 360;
}

/**
 * Estimate travel time based on distance and vehicle type
 * Returns minutes
 */
export function estimateTravelTime(
  distanceKm: number,
  vehicleType: string = 'motorcycle'
): number {
  const speedsKmh: Record<string, number> = {
    walking: 5,
    bicycle: 15,
    electric_scooter: 20,
    motorcycle: 30,
    car: 25, // accounting for traffic/parking
  };
  const speed = speedsKmh[vehicleType] || 25;
  // Add 5 minutes base time for pickup/delivery logistics
  return Math.round((distanceKm / speed) * 60) + 5;
}

/**
 * Get the bounding box for a set of coordinates
 */
export function getBoundingBox(coordinates: Coordinates[]): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  const lats = coordinates.map((c) => c.latitude);
  const lons = coordinates.map((c) => c.longitude);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

/**
 * Calculate center coordinate from array of coordinates
 */
export function getCenterCoordinate(coordinates: Coordinates[]): Coordinates {
  const { minLat, maxLat, minLon, maxLon } = getBoundingBox(coordinates);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
  };
}

/**
 * Check if a coordinate is within a radius (km) of another
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(center, point) <= radiusKm;
}

/**
 * Get map region to fit markers
 */
export function getMapRegion(
  coordinates: Coordinates[],
  padding = 0.01
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const center = getCenterCoordinate(coordinates);
  const { minLat, maxLat, minLon, maxLon } = getBoundingBox(coordinates);

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: Math.max(maxLat - minLat + padding, 0.02),
    longitudeDelta: Math.max(maxLon - minLon + padding, 0.02),
  };
}

/**
 * Format coordinates for Google Maps URL
 */
export function toGoogleMapsCoord(coord: Coordinates): string {
  return `${coord.latitude},${coord.longitude}`;
}
