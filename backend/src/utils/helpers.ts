// ============================================================
// אשדוד-שליח – General Utility Helpers
// ============================================================

import { EARTH_RADIUS_KM } from '../config/constants';
import { GeoPoint, ApiResponse, PaginatedResponse } from '../types';

// ─────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────

/**
 * Haversine formula: calculate distance (km) between two lat/lng points.
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const hav =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLon * sinDLon;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(hav));
}

/**
 * Estimate travel time in minutes (rough: 30 km/h average city speed).
 */
export function estimateTravelMinutes(distanceKm: number, speedKmh = 30): number {
  return Math.ceil((distanceKm / speedKmh) * 60);
}

// ─────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    page,
    limit,
    total,
    hasMore: page * limit < total,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────
// Date / time helpers
// ─────────────────────────────────────────

export function getCurrentHour(date = new Date()): number {
  return date.getHours();
}

export function isNightHour(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

export function isPeakHour(hour: number): boolean {
  return (hour >= 12 && hour < 14) || (hour >= 19 && hour < 21);
}

export function formatDateHebrew(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────
// Number helpers
// ─────────────────────────────────────────

export function roundToNearestFive(amount: number): number {
  return Math.ceil(amount / 5) * 5;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────
// String helpers
// ─────────────────────────────────────────

export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// ─────────────────────────────────────────
// Pagination helpers
// ─────────────────────────────────────────

export function getPaginationParams(
  queryPage: unknown,
  queryLimit: unknown,
  maxLimit = 100
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(String(queryPage ?? '1'), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(queryLimit ?? '20'), 10) || 20)
  );
  return { page, limit, offset: (page - 1) * limit };
}
