/**
 * DeliveriesV2 Constants
 * =======================
 *
 * Centralized constants for the DeliveriesV2 component.
 */

// ============================================================================
// COLORS
// ============================================================================

/** Google Maps blue color for active elements */
export const GOOGLE_BLUE = '#4285F4';

/** Gray color for completed/inactive elements */
export const GOOGLE_GRAY = '#9E9E9E';

/** Solid blue-gray for upcoming routes */
export const ROUTE_UPCOMING_COLOR = '#607D8B';

// ============================================================================
// MAP STYLING
// ============================================================================

/**
 * Google Maps Navigation Style
 * Cleaner look optimized for driving navigation
 */
export const GOOGLE_NAVIGATION_MAP_STYLE = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ saturation: -20 }, { lightness: 10 }]
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.park',
    stylers: [{ visibility: 'simplified' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ saturation: -30 }, { lightness: 20 }]
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ saturation: -50 }, { lightness: 20 }]
  }
];
