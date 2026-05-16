/**
 * Routing Utilities
 * ==================
 *
 * PURPOSE:
 * Provides functions for fetching and processing road-following routes
 * from Google Directions API.
 *
 * CONTAINS:
 * - decodePolyline: Decodes Google's encoded polyline format
 * - getGoogleDirectionsRoute: Fetches route from Google Directions API
 *
 * ALGORITHM REFERENCE:
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

import { Platform } from 'react-native';

import Config from 'react-native-config';

// ============================================================================
// TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Google Maps API Key
 * - iOS: From environment variable GOOGLE_MAPS_API_IOS_KEY
 * - Android: Hardcoded (or from environment)
 *
 * NOTE: In production, both should come from environment variables
 */
const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios' ? Config.GOOGLE_MAPS_API_IOS_KEY : 'need key here';

// ============================================================================
// POLYLINE DECODER
// ============================================================================

/**
 * Decodes Google's Encoded Polyline Algorithm Format
 *
 * WHY IS THIS NEEDED?
 * Google Directions API returns routes as compressed strings to save bandwidth.
 * A route with 1000 points would be huge as JSON, but tiny as an encoded string.
 *
 * HOW IT WORKS:
 * 1. Each character represents 5 bits of data
 * 2. Characters are ASCII offset by 63 (so they're printable)
 * 3. Coordinates are stored as deltas (difference from previous point)
 * 4. Values are multiplied by 1e5 for precision
 *
 * EXAMPLE:
 * Input:  "_p~iF~ps|U" (encoded string)
 * Output: [{lat: 38.5, lng: -120.2}, {lat: 40.7, lng: -120.95}, ...]
 *
 * @param encoded - The encoded polyline string from Google API
 * @returns Array of coordinate objects with latitude and longitude
 */
export const decodePolyline = (encoded: string): Coordinates[] => {
  const points: Coordinates[] = [];
  let index = 0; // Current position in the encoded string
  let lat = 0; // Running latitude (accumulates deltas)
  let lng = 0; // Running longitude (accumulates deltas)

  while (index < encoded.length) {
    // ========================================
    // DECODE LATITUDE
    // ========================================
    let shift = 0; // Bit position for combining chunks
    let result = 0; // Accumulated result
    let byte: number; // Current byte being processed

    // Read 5-bit chunks until we hit a terminator (byte < 0x20)
    do {
      // Step 1: Get ASCII code and subtract 63 (Google's offset)
      byte = encoded.charCodeAt(index++) - 63;

      // Step 2: Extract the 5 data bits (mask with 0x1f = 00011111)
      // Step 3: Shift to correct position and add to result
      result |= (byte & 0x1f) << shift;

      // Step 4: Move to next 5-bit position
      shift += 5;
    } while (byte >= 0x20); // Continue if continuation bit is set

    // Step 5: Handle negative numbers (two's complement)
    // If least significant bit is 1, number is negative
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;

    // Step 6: Add delta to running total
    lat += deltaLat;

    // ========================================
    // DECODE LONGITUDE (same algorithm)
    // ========================================
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    // ========================================
    // STORE DECODED POINT
    // ========================================
    // Divide by 1e5 to get actual coordinate values
    // (Google stores coordinates multiplied by 100,000 for precision)
    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5
    });
  }

  return points;
};

// ============================================================================
// GOOGLE DIRECTIONS API
// ============================================================================

/**
 * Fetches a road-following route from Google Directions API
 *
 * HOW IT WORKS:
 * 1. Sends request to Google Directions API with origin and destination
 * 2. API returns optimal driving route with encoded polyline
 * 3. Decodes polyline to get array of coordinates
 * 4. Returns coordinates that follow actual roads
 *
 * FALLBACK:
 * If API fails or returns no route, returns a straight line between points.
 * This ensures the app always has something to display.
 *
 * API RESPONSE STRUCTURE:
 * {
 *   status: "OK",
 *   routes: [{
 *     overview_polyline: {
 *       points: "_p~iF~ps|U..."  // <-- This is what we decode
 *     },
 *     legs: [...],              // Detailed turn-by-turn (not used here)
 *   }]
 * }
 *
 * @param originLat - Starting point latitude
 * @param originLng - Starting point longitude
 * @param destLat - Destination latitude
 * @param destLng - Destination longitude
 * @returns Promise resolving to array of coordinates following roads
 */
export const getGoogleDirectionsRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<Coordinates[]> => {
  try {
    // Build API URL
    const origin = `${originLat},${originLng}`;
    const destination = `${destLat},${destLng}`;
    const url =
      `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin}&` +
      `destination=${destination}&` +
      `mode=driving&` + // We want driving routes (not walking/transit)
      `key=${GOOGLE_MAPS_API_KEY}`;

    console.log('[routingUtils] Fetching route from Google Directions API');

    // Make API request
    const response = await fetch(url);
    const data = await response.json();

    // Check for successful response
    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      // Extract the encoded polyline
      const encodedPolyline = data.routes[0].overview_polyline?.points;

      if (encodedPolyline) {
        // Decode and return the route
        const decodedRoute = decodePolyline(encodedPolyline);
        console.log(`[routingUtils] Route decoded: ${decodedRoute.length} points`);
        return decodedRoute;
      }
    }

    // API returned no route (could be ZERO_RESULTS, etc.)
    console.warn('[routingUtils] Google API returned no route:', data.status);
    return createDirectLine(originLat, originLng, destLat, destLng);
  } catch (error) {
    // Network error or other failure
    console.error('[routingUtils] Google Directions API error:', error);
    return createDirectLine(originLat, originLng, destLat, destLng);
  }
};

/**
 * Creates a direct line between two points (fallback when API fails)
 *
 * @param originLat - Starting latitude
 * @param originLng - Starting longitude
 * @param destLat - Ending latitude
 * @param destLng - Ending longitude
 * @returns Array with just start and end points
 */
const createDirectLine = (originLat: number, originLng: number, destLat: number, destLng: number): Coordinates[] => {
  console.log('[routingUtils] Using direct line fallback');
  return [
    { latitude: originLat, longitude: originLng },
    { latitude: destLat, longitude: destLng }
  ];
};

// ============================================================================
// ROUTE CACHING (Optional Enhancement)
// ============================================================================

/**
 * Simple in-memory cache for routes
 * Prevents unnecessary API calls for same origin-destination pairs
 */
const routeCache = new Map<string, Coordinates[]>();

/**
 * Generates a cache key for a route
 */
const getCacheKey = (originLat: number, originLng: number, destLat: number, destLng: number): string => {
  // Round to 4 decimal places to allow for minor GPS variations
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return `${round(originLat)},${round(originLng)}-${round(destLat)},${round(destLng)}`;
};

/**
 * Gets a cached route or fetches a new one
 * Use this for static routes that don't need real-time updates
 */
export const getCachedRoute = async (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<Coordinates[]> => {
  const cacheKey = getCacheKey(originLat, originLng, destLat, destLng);

  // Return cached route if available
  if (routeCache.has(cacheKey)) {
    console.log('[routingUtils] Using cached route');
    return routeCache.get(cacheKey)!;
  }

  // Fetch new route and cache it
  const route = await getGoogleDirectionsRoute(originLat, originLng, destLat, destLng);
  routeCache.set(cacheKey, route);

  return route;
};

/**
 * Clears the route cache
 * Call this when deliveries change significantly
 */
export const clearRouteCache = (): void => {
  routeCache.clear();
  console.log('[routingUtils] Route cache cleared');
};

/** Format distance for display: "200 m away" or "1.2 km away" */
export const formatDistanceAway = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  const km = meters / 1000;
  return `${km % 1 === 0 ? km : km.toFixed(1)} km away`;
};
