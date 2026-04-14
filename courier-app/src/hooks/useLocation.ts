// ============================================================
// useLocation HOOK - אשדוד-שליח Courier App
// ============================================================

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  setCurrentLocation,
  setTracking,
  setLocationError,
  clearLocation,
} from '../store/locationSlice';
import { locationService } from '../services/location.service';
import { socketService } from '../services/socket.service';
import { Coordinates } from '../types';

export function useLocation(autoStart = false) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentLocation, isTracking, lastUpdated, error } = useSelector(
    (state: RootState) => state.location
  );
  const trackingRef = useRef(false);

  const handleLocationUpdate = useCallback(
    (location: Coordinates) => {
      dispatch(setCurrentLocation(location));
      socketService.updateLocation(location);
    },
    [dispatch]
  );

  const startTracking = useCallback(async () => {
    if (trackingRef.current) return;
    trackingRef.current = true;

    const success = await locationService.startTracking(handleLocationUpdate);
    if (success) {
      dispatch(setTracking(true));
    } else {
      dispatch(setLocationError('לא ניתן לגשת למיקום. אנא אפשר גישה במסך הגדרות.'));
      trackingRef.current = false;
    }
  }, [dispatch, handleLocationUpdate]);

  const stopTracking = useCallback(async () => {
    await locationService.stopTracking();
    dispatch(setTracking(false));
    trackingRef.current = false;
  }, [dispatch]);

  const getCurrentLocation = useCallback(async (): Promise<Coordinates | null> => {
    const location = await locationService.getCurrentLocation();
    if (location) {
      dispatch(setCurrentLocation(location));
    }
    return location;
  }, [dispatch]);

  const resetLocation = useCallback(() => {
    dispatch(clearLocation());
  }, [dispatch]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
    return () => {
      if (autoStart) {
        stopTracking();
      }
    };
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    currentLocation,
    isTracking,
    lastUpdated,
    error,
    startTracking,
    stopTracking,
    getCurrentLocation,
    resetLocation,
  };
}

export default useLocation;
