/**
 * useDeliveryRoutes Hook
 * =======================
 * 
 * PURPOSE:
 * Manages all route calculations for the delivery system.
 * Handles both static routes (between stops) and active route (driver to next stop).
 * 
 * ROUTE TYPES:
 * 1. STATIC ROUTES: Routes between consecutive delivery stops
 *    - Calculated once when deliveries load
 *    - Don't change as driver moves
 *    - Example: Stop1 → Stop2 → Stop3 → Stop4 → Stop5
 * 
 * 2. ACTIVE ROUTE: Route from driver's current position to next stop
 *    - Recalculated when driver moves
 *    - Shows real-time navigation path
 *    - Example: Driver 🚗 → Stop1

 * NOTE: nextDeliveryIndex is calculated internally (always 0) since completed
 * deliveries are filtered out before reaching this hook.
 */

import { useEffect, useState, useCallback } from 'react';

import { Delivery } from '@calo/driver-types';

import { getGoogleDirectionsRoute, getCachedRoute, Coordinates } from '../utils/routingUtils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents a route segment between two delivery stops
 */
export interface RouteSegment {
  /** Array of coordinates that form the route (follows roads) */
  waypoints: Coordinates[];
  /** Index of the starting delivery (in sorted array) */
  fromIndex: number;
  /** Index of the ending delivery (in sorted array) */
  toIndex: number;
}

/**
 * Custom hook for managing delivery routes
 *
 * @param filteredDeliveries - Deliveries filtered by current tab
 * @param driverLocation - Current driver GPS coordinates
 * @returns Object with route data and loading states
 */
export const useDeliveryRoutes = (filteredDeliveries: Delivery[], driverLocation: Coordinates | null) => {
  // Next delivery is always the first one (index 0) since completed deliveries are filtered out
  const nextDeliveryIndex = 0;

  // Static routes between consecutive stops
  const [staticRouteSegments, setStaticRouteSegments] = useState<RouteSegment[]>([]);

  // Active route from driver to next stop
  const [activeRoute, setActiveRoute] = useState<Coordinates[]>([]);

  // Loading states for UI feedback
  const [isStaticRoutesLoading, setIsStaticRoutesLoading] = useState<boolean>(true);

  // ========================================
  // STATIC ROUTES CALCULATION
  // ========================================

  /**
   * Calculates routes between all consecutive delivery stops
   *
   * ALGORITHM:
   * For deliveries [D1, D2, D3, D4, D5]:
   * - Calculate route D1 → D2 (segment 0)
   * - Calculate route D2 → D3 (segment 1)
   * - Calculate route D3 → D4 (segment 2)
   * - Calculate route D4 → D5 (segment 3)
   *
   * OPTIMIZATION:
   * Uses cached routes to avoid duplicate API calls
   */
  const calculateStaticRoutes = useCallback(async () => {
    // Need at least 2 deliveries to have routes between them
    if (filteredDeliveries.length < 2) {
      console.log('[useDeliveryRoutes] Less than 2 deliveries, no static routes needed');
      setStaticRouteSegments([]);
      setIsStaticRoutesLoading(false);
      return;
    }

    setIsStaticRoutesLoading(true);

    console.log(`[useDeliveryRoutes] Calculating ${filteredDeliveries.length - 1} static route segments`);

    try {
      const segments: RouteSegment[] = [];

      // Calculate route for each pair of consecutive stops
      for (let i = 0; i < filteredDeliveries.length - 1; i++) {
        const fromDelivery = filteredDeliveries[i];
        const toDelivery = filteredDeliveries[i + 1];

        console.log(`[useDeliveryRoutes] Calculating segment ${i}: Stop${i + 1} → Stop${i + 2}`);

        // Use cached route to avoid duplicate API calls
        const waypoints = await getCachedRoute(
          fromDelivery.deliveryAddress.lat,
          fromDelivery.deliveryAddress.lng,
          toDelivery.deliveryAddress.lat,
          toDelivery.deliveryAddress.lng
        );

        segments.push({
          waypoints,
          fromIndex: i,
          toIndex: i + 1
        });
      }

      console.log(`[useDeliveryRoutes] Static routes complete: ${segments.length} segments`);
      setStaticRouteSegments(segments);
    } catch (error) {
      console.error('[useDeliveryRoutes] Failed to calculate static routes:', error);
    } finally {
      setIsStaticRoutesLoading(false);
    }
  }, [filteredDeliveries]);

  // ========================================
  // ACTIVE ROUTE CALCULATION
  // ========================================

  /**
   * Calculates route from driver's current location to next delivery stop
   *
   * WHEN CALLED:
   * - When driver location changes (driver moves)
   * - Target is always the first delivery (index 0) since completed deliveries are filtered out
   *
   * NOTE:
   * Does NOT use cache because driver position constantly changes.
   * Next delivery index is always 0 (calculated internally).
   */
  const calculateActiveRoute = useCallback(async () => {
    // Need driver location and at least one delivery
    if (!driverLocation || filteredDeliveries.length === 0) {
      console.log('[useDeliveryRoutes] Cannot calculate active route: missing location or deliveries');
      setActiveRoute([]);
      return;
    }

    // Get the target delivery
    const targetDelivery = filteredDeliveries[nextDeliveryIndex];
    if (!targetDelivery) {
      console.log('[useDeliveryRoutes] No target delivery for active route');
      setActiveRoute([]);
      return;
    }

    try {
      console.log(`[useDeliveryRoutes] Calculating active route to Stop${nextDeliveryIndex + 1}`);

      // Get fresh route (don't cache - driver position changes)
      const waypoints = await getGoogleDirectionsRoute(
        driverLocation.latitude,
        driverLocation.longitude,
        targetDelivery.deliveryAddress.lat,
        targetDelivery.deliveryAddress.lng
      );

      setActiveRoute(waypoints);
    } catch (error) {
      console.error('[useDeliveryRoutes] Failed to calculate active route:', error);
      // Don't set error state for active route failures - use fallback
      setActiveRoute([
        driverLocation,
        {
          latitude: targetDelivery.deliveryAddress.lat,
          longitude: targetDelivery.deliveryAddress.lng
        }
      ]);
    }
  }, [driverLocation, filteredDeliveries]);

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Effect: Calculate static routes when deliveries change
   * Runs once when deliveries are loaded/sorted
   *
   * INTENTIONALLY DISABLED: Route calculation commented out to avoid API calls
   * Uncomment when ready to enable route calculations
   */
  useEffect(() => {
    // calculateStaticRoutes();
  }, [calculateStaticRoutes]);

  /**
   * Effect: Calculate active route when driver moves or next stop changes
   * Runs frequently during navigation
   *
   * INTENTIONALLY DISABLED: Route calculation commented out to avoid API calls
   * Uncomment when ready to enable active route updates
   */
  useEffect(() => {
    // calculateActiveRoute();
  }, [calculateActiveRoute]);

  // ========================================
  // RETURN
  // ========================================

  return {
    staticRouteSegments,
    activeRoute,
    isStaticRoutesLoading
  };
};

export default useDeliveryRoutes;
