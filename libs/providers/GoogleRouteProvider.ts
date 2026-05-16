import { GoogleAuth } from 'google-auth-library';
import { chunk } from 'lodash-es';
import { logger } from '@calo/core';
import { RouteCalculationProps, RouteDuration } from '../interfaces';
import { addMinutes } from 'date-fns';

const CHUNK_SIZE = 25;

interface GoogleRouteResponse {
  routes: Array<{
    legs: Array<{
      duration: string;
      distanceMeters: number;
      startLocation: { latitude: number; longitude: number };
      endLocation: { latitude: number; longitude: number };
    }>;
    polyline?: { encodedPolyline: string };
    optimizedIntermediateWaypointIndex?: number[];
  }>;
}

class GoogleRouteProvider {
  public async generateRoute(route: RouteCalculationProps): Promise<RouteDuration[]> {
    try {
      const serviceAccountJson = JSON.parse(process.env.GOOGLE_ROUTING_SERVICE_ACCOUNT_JSON!);
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        credentials: serviceAccountJson
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();

      const originalWaypoints = route.WaypointPositions || [];

      if (originalWaypoints.length === 0) {
        logger.warn('No waypoints provided for route calculation');
        return [];
      }

      const waypointChunks = chunk(originalWaypoints, CHUNK_SIZE);
      let allDurations: RouteDuration[] = [];
      let previousPoint = route.DeparturePosition;
      let globalOrderOffset = 0;

      logger.debug(`Processing ${originalWaypoints.length} waypoints in ${waypointChunks.length} chunk(s)`);

      for (const [chunkIndex, waypointChunk] of waypointChunks.entries()) {
        const lastWaypointInChunk = waypointChunk[waypointChunk.length - 1];
        if (!lastWaypointInChunk) {
          throw new Error(`No waypoints found in chunk ${chunkIndex}`);
        }

        // Always use the last waypoint as destination (not back to kitchen) so timings
        // are only for deliveries. Exclude last waypoint from intermediates to avoid duplication.
        const waypointsForIntermediates = waypointChunk.slice(0, -1);

        const waypoints = this.convertWaypointsToGoogleFormat(waypointsForIntermediates);
        const chunkDestination = lastWaypointInChunk;

        const requestBody: any = {
          origin: {
            location: {
              latLng: {
                latitude: previousPoint[1],
                longitude: previousPoint[0]
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: chunkDestination[1],
                longitude: chunkDestination[0]
              }
            }
          },
          intermediates: waypoints,
          travelMode: 'DRIVE',
          routingPreference: route.OptimizeRoute ? 'TRAFFIC_AWARE_OPTIMAL' : 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false
          },
          units: 'METRIC'
        };

        if (route.DepartureTime) {
          const departureDate = new Date(route.DepartureTime);
          const now = new Date();
          if (departureDate > addMinutes(now, 5)) {
            requestBody.departureTime = route.DepartureTime;
          } else {
            logger.warn(`DepartureTime ${route.DepartureTime} is in the past, using current time instead`);
          }
        }

        if (route.OptimizeRoute && waypoints.length > 1) {
          requestBody.optimizeWaypointOrder = true;
        }

        logger.debug(`Google Routes API request [chunk ${chunkIndex}]:`, JSON.stringify(requestBody, null, 2));

        let fieldMask =
          'routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation';
        if (route.OptimizeRoute && waypoints.length > 1) {
          fieldMask += ',routes.optimizedIntermediateWaypointIndex';
        }

        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.token}`,
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': fieldMask
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          let errorBody: any;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = await response.text();
          }
          logger.error(`Google Routes API responded with error [chunk ${chunkIndex}]:`, response.status, errorBody);
          throw new Error(`Google Routes API error: ${response.status} - ${JSON.stringify(errorBody)}`);
        }

        const responseData = (await response.json()) as GoogleRouteResponse;
        logger.debug(`Google Routes API response [chunk ${chunkIndex}]:`, JSON.stringify(responseData, null, 2));

        const chunkDurations = this.parseGoogleRouteResponse(responseData, route.OptimizeRoute ?? false);

        const adjustedDurations = chunkDurations.map((duration) => ({
          ...duration,
          order: (duration.order ?? 0) + globalOrderOffset,
          priority: (duration.priority ?? 0) + globalOrderOffset
        }));

        allDurations = [...allDurations, ...adjustedDurations];

        globalOrderOffset += waypointChunk.length;

        previousPoint = chunkDestination;
      }

      logger.debug('Combined durations from all chunks:', JSON.stringify(allDurations, null, 2));
      return allDurations;
    } catch (error) {
      logger.error('Error calling Google Routes API:', error);
      throw error;
    }
  }

  private convertWaypointsToGoogleFormat(waypoints: number[][]) {
    return waypoints.reduce(
      (acc, [lng, lat]) => {
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          logger.warn(`Invalid waypoint coordinates: [${lng}, ${lat}]`);
          return acc;
        }
        acc.push({
          location: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        });
        return acc;
      },
      [] as Array<{ location: { latLng: { latitude: number; longitude: number } } }>
    );
  }

  private parseGoogleRouteResponse(response: GoogleRouteResponse, optimized: boolean): RouteDuration[] {
    if (!response.routes || response.routes.length === 0) {
      logger.warn('No routes returned from Google Routes API');
      return [];
    }

    const route = response.routes[0];
    const legs = route?.legs ?? [];

    if (legs.length === 0) {
      logger.warn('No legs returned from Google Routes API');
      return [];
    }

    // Destination is always the last waypoint, so all legs are to waypoints
    const waypointLegs = legs;

    const durations = waypointLegs.map((leg) => {
      const durationSeconds = parseInt(leg.duration.replace('s', '')) || 0;
      return Math.round(durationSeconds / 60);
    });

    // If route was optimized and we have waypoint order information then map back to original indices
    if (optimized && route?.optimizedIntermediateWaypointIndex && route.optimizedIntermediateWaypointIndex.length > 0) {
      return durations.reduce((acc, duration, optimizedIndex) => {
        const originalWaypointIndex = route.optimizedIntermediateWaypointIndex![optimizedIndex];
        if (originalWaypointIndex === undefined || originalWaypointIndex === null) {
          logger.warn(`No original waypoint index found for optimized index: ${optimizedIndex}`);
          return acc;
        }
        return [
          ...acc,
          {
            order: originalWaypointIndex + 1,
            duration: duration,
            priority: optimizedIndex
          }
        ];
      }, [] as Array<RouteDuration>);
    }

    return durations.map((duration, index) => ({
      order: index + 1,
      duration: duration,
      priority: index
    }));
  }
}

export default GoogleRouteProvider;
