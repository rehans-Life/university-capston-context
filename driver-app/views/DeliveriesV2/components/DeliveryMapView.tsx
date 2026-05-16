/**
 * DeliveryMapView Component
 * =========================
 *
 * PURPOSE:
 * Renders the map view with driver marker, delivery markers, and routes.
 * Handles all map-related rendering logic.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { Delivery } from '@calo/driver-types';

import { GOOGLE_BLUE, GOOGLE_GRAY, ROUTE_UPCOMING_COLOR, GOOGLE_NAVIGATION_MAP_STYLE } from '../constants';
import { Coordinates, RouteSegment } from '../hooks';

import { CarIconMarker, AnimatedMarker } from './MapMarkers';

// ============================================================================
// TYPES
// ============================================================================

interface DeliveryMapViewProps {
  mapRef: React.RefObject<MapView>;
  driverLocation: Coordinates;
  filteredDeliveries: Delivery[];
  activeRoute: Coordinates[];
  staticRouteSegments: RouteSegment[];
  isStaticRoutesLoading: boolean;
  /** Map of delivery ID to original sequence number (for stable numbering) */
  deliverySequenceMap: Map<string, number>;
  /** Callback when a delivery marker is pressed */
  onMarkerPress?: (delivery: Delivery) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DeliveryMapView: React.FC<DeliveryMapViewProps> = ({
  mapRef,
  driverLocation,
  filteredDeliveries,
  activeRoute,
  staticRouteSegments,
  isStaticRoutesLoading,
  deliverySequenceMap,
  onMarkerPress
}) => {
  // Next delivery is always the first one (index 0) since completed deliveries are filtered out
  const nextDeliveryIndex = 0;

  // Start map centered on driver so it doesn't flash on first delivery
  const initialRegion = {
    latitude: driverLocation.latitude,
    longitude: driverLocation.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={GOOGLE_NAVIGATION_MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        loadingEnabled={true}
        mapType="standard"
        pitchEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        initialRegion={initialRegion}
      >
        {/* Driver Marker */}
        <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={25}>
          <CarIconMarker />
        </Marker>

        {/* Active Route (Driver → Next Stop) */}
        {activeRoute.length > 0 && (
          <Polyline
            key="active-route"
            coordinates={activeRoute}
            strokeColor={GOOGLE_BLUE}
            strokeWidth={10}
            lineCap="round"
            lineJoin="round"
            zIndex={20}
          />
        )}

        {/* Static Routes (Between Stops) */}
        {staticRouteSegments.map((segment) => {
          const isUpcoming = segment.fromIndex >= nextDeliveryIndex;
          const isCompleted = segment.toIndex <= nextDeliveryIndex;

          return (
            <Polyline
              key={`route-${segment.fromIndex}-to-${segment.toIndex}`}
              coordinates={segment.waypoints}
              strokeColor={isCompleted ? GOOGLE_GRAY : ROUTE_UPCOMING_COLOR}
              strokeWidth={isCompleted ? 4 : 6}
              lineDashPattern={isUpcoming && !isCompleted ? [10, 6] : []}
              lineCap="round"
              lineJoin="round"
              zIndex={isCompleted ? 2 : 5}
            />
          );
        })}

        {/* Fallback: Direct lines while loading */}
        {filteredDeliveries.length > 0 && isStaticRoutesLoading && (
          <>
            <Polyline
              key="fallback-driver-to-first"
              coordinates={[
                driverLocation,
                {
                  latitude: filteredDeliveries[0].deliveryAddress.lat,
                  longitude: filteredDeliveries[0].deliveryAddress.lng
                }
              ]}
              strokeColor={GOOGLE_BLUE}
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={20}
            />
            {filteredDeliveries.slice(1).map((delivery, index) => (
              <Polyline
                key={`fallback-${index}`}
                coordinates={[
                  {
                    latitude: filteredDeliveries[index].deliveryAddress.lat,
                    longitude: filteredDeliveries[index].deliveryAddress.lng
                  },
                  {
                    latitude: delivery.deliveryAddress.lat,
                    longitude: delivery.deliveryAddress.lng
                  }
                ]}
                strokeColor={ROUTE_UPCOMING_COLOR}
                strokeWidth={8}
                lineDashPattern={[10, 6]}
                lineCap="round"
                lineJoin="round"
                zIndex={1}
              />
            ))}
          </>
        )}

        {/* Delivery Markers */}
        {filteredDeliveries.map((delivery, index) => {
          const isNext = index === nextDeliveryIndex;
          const isCompleted = index < nextDeliveryIndex;

          // Get original sequence number from map (based on ALL deliveries, not filtered)
          // This ensures sequence numbers remain stable even when deliveries are filtered out
          const originalSequenceNumber = deliverySequenceMap.get(delivery.id) || index + 1;

          return (
            <Marker
              key={delivery.id}
              coordinate={{
                latitude: delivery.deliveryAddress.lat,
                longitude: delivery.deliveryAddress.lng
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              zIndex={isNext ? 15 : isCompleted ? 5 : 10}
              onPress={() => onMarkerPress?.(delivery)}
            >
              <AnimatedMarker stopNumber={originalSequenceNumber} isNext={isNext} isCompleted={isCompleted} />
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1
  },
  map: {
    flex: 1
  }
});
