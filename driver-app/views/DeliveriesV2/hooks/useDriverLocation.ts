/**
 * useDriverLocation Hook
 * =======================
 *
 * PURPOSE:
 * Tracks the driver's real-time GPS location and calculates driving direction (bearing).
 *
 * FEATURES:
 * - Fetches GPS coordinates every 15 seconds
 * - Calculates bearing based on movement direction
 * - Only updates bearing when driver moves significantly (>5m)
 *
 * USAGE:
 * const { driverLocation, currentBearing } = useDriverLocation();
 */

import { useEffect, useState, useCallback, useRef } from 'react';

import { getDistance, getGreatCircleBearing } from 'geolib';

import { getCurPos } from '@helpers';

import { Coordinates } from '../utils/routingUtils';

// ============================================================================
// CONFIGURATION
// ============================================================================

const UPDATE_INTERVAL = 15000; // 15 seconds
const MIN_MOVEMENT_THRESHOLD = 5; // meters — only update bearing when driver moves more than this
const INITIAL_BEARING_FETCH_DELAY_MS = 2500; // one-time refetch after first location to get bearing sooner

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for tracking driver's GPS location and movement direction
 *
 * @returns Object containing:
 *   - driverLocation: Current GPS coordinates (null until first successful fetch)
 *   - currentBearing: Compass direction (0-360°); set once we have two positions (soon after first load)
 *   - isLocationLoading: Whether initial location is being fetched
 *   - locationError: Any error that occurred during location fetch
 *   - refreshLocation: Function to manually refresh location
 */
export const useDriverLocation = () => {
  // ========================================
  // STATE
  // ========================================
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [currentBearing, setCurrentBearing] = useState<number>(0);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(true);
  /** True once we have at least 2 positions (bearing computed or ready to use) — use to keep map loader visible until bearing is done */
  const [isBearingReady, setIsBearingReady] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const prevLocRef = useRef<Coordinates | null>(null);
  const initialBearingScheduledRef = useRef(false);
  const initialBearingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ========================================
  // REAL GPS LOCATION FETCH
  // ========================================

  /**
   * Fetches current GPS position and updates driver location + bearing.
   *
   * - First call: stores position, schedules a second fetch in ~2.5s so we can compute bearing from two points.
   * - Later calls: if we have a previous position, marks bearing ready and updates bearing when movement > 5m; always updates location.
   * - On error: sets locationError and leaves previous location unchanged.
   */
  const fetchDriverLocation = useCallback(async () => {
    try {
      const pos = await getCurPos();
      if (!pos?.latitude || !pos?.longitude) return;

      const prevLoc = prevLocRef.current;

      if (prevLoc) {
        setIsBearingReady(true);
        const distanceMoved = getDistance(prevLoc, pos);
        if (distanceMoved > MIN_MOVEMENT_THRESHOLD) {
          setCurrentBearing(getGreatCircleBearing(prevLoc, pos));
        }
      } else if (!initialBearingScheduledRef.current) {
        initialBearingScheduledRef.current = true;
        initialBearingTimeoutRef.current = setTimeout(() => {
          fetchDriverLocation();
        }, INITIAL_BEARING_FETCH_DELAY_MS);
      }

      prevLocRef.current = pos;
      setDriverLocation(pos);
      setLocationError(null);
    } catch (error) {
      console.error('[useDriverLocation] Failed to get GPS position:', error);
      setLocationError('Failed to get location');
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // ========================================
  // EFFECTS
  // ========================================

  useEffect(() => {
    fetchDriverLocation();
    const locationInterval = setInterval(fetchDriverLocation, UPDATE_INTERVAL);
    return () => {
      clearInterval(locationInterval);
      if (initialBearingTimeoutRef.current) {
        clearTimeout(initialBearingTimeoutRef.current);
        initialBearingTimeoutRef.current = null;
      }
    };
  }, [fetchDriverLocation]);

  // ========================================
  // RETURN
  // ========================================

  return {
    driverLocation,
    currentBearing,
    isLocationLoading,
    /** True once we have 2+ positions so bearing is available (use to show map only when ready) */
    isBearingReady,
    locationError,
    refreshLocation: fetchDriverLocation
  };
};

export default useDriverLocation;
