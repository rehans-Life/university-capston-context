/**
 * useNavigationCamera Hook
 * =========================
 *
 * PURPOSE:
 * Controls the map camera for navigation experience.
 * Handles camera positioning, zoom, and animations.
 *
 * MAIN FEATURES:
 * - Centers map on driver when location updates
 * - Dynamic zoom based on distance to destination
 * - Smooth camera animations
 *
 * USAGE:
 * const { centerOnDriver } = useNavigationCamera(mapRef);
 */

import { useCallback, RefObject } from 'react';

import { getDistance } from 'geolib';
import MapView from 'react-native-maps';

import { Coordinates } from '../utils/routingUtils';

// ============================================================================
// TYPES
// ============================================================================
// Note: Coordinates type is imported from '../utils/routingUtils' to avoid duplication

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Zoom levels based on distance to destination
 * Far away = zoomed out (see more area)
 * Close = zoomed in (see more detail)
 */
const ZOOM_CONFIG = {
  VERY_FAR: { distance: 5000, zoom: 14 }, // > 5km
  FAR: { distance: 2000, zoom: 15 }, // 2-5km
  MEDIUM: { distance: 1000, zoom: 16 }, // 1-2km
  CLOSE: { distance: 500, zoom: 17 }, // 500m-1km
  VERY_CLOSE: { distance: 0, zoom: 18 } // < 500m
};

/**
 * Camera animation duration (milliseconds)
 */
const CENTER_DRIVER_ANIMATION_DURATION = 300;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for managing map camera during navigation
 *
 * @param mapRef - Reference to the MapView component
 * @returns Object with camera control functions
 */
export const useNavigationCamera = (mapRef: RefObject<MapView>) => {
  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Calculates zoom level based on distance to destination
   *
   * @param distanceMeters - Distance to destination in meters
   * @returns Zoom level (14-18)
   */
  const calculateZoomLevel = useCallback((distanceMeters: number): number => {
    if (distanceMeters > ZOOM_CONFIG.VERY_FAR.distance) return ZOOM_CONFIG.VERY_FAR.zoom;
    if (distanceMeters > ZOOM_CONFIG.FAR.distance) return ZOOM_CONFIG.FAR.zoom;
    if (distanceMeters > ZOOM_CONFIG.MEDIUM.distance) return ZOOM_CONFIG.MEDIUM.zoom;
    if (distanceMeters > ZOOM_CONFIG.CLOSE.distance) return ZOOM_CONFIG.CLOSE.zoom;
    return ZOOM_CONFIG.VERY_CLOSE.zoom;
  }, []);

  // ========================================
  // MAIN CAMERA FUNCTIONS
  // ========================================

  /**
   * Centers map on driver location
   * Keeps driver visible when location updates
   * Uses consistent zoom calculation based on distance
   *
   * CURRENTLY USED: Called automatically when driverLocation updates
   *
   * @param driverLocation - Current driver position
   * @param destination - Optional: destination for distance-based zoom
   */
  const centerOnDriver = useCallback(
    (driverLocation: Coordinates, destination?: Coordinates): void => {
      if (!mapRef.current) return;

      // Calculate zoom: use distance to destination if provided, otherwise default to VERY_FAR
      const distance = destination ? getDistance(driverLocation, destination) : ZOOM_CONFIG.VERY_FAR.distance + 100;
      const zoom = calculateZoomLevel(distance);

      // Center on driver with calculated zoom
      mapRef.current.animateCamera(
        {
          center: driverLocation,
          zoom: zoom
        },
        { duration: CENTER_DRIVER_ANIMATION_DURATION }
      );
    },
    [mapRef, calculateZoomLevel]
  );

  // ========================================
  // RETURN
  // ========================================

  return {
    centerOnDriver
  };
};

export default useNavigationCamera;
