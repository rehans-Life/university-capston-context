import { logger } from '@teamcalo/core';
import FileService from 'libs/services/FileService';
import { LatLng } from 'libs/interfaces';
import { DeliveryTime, ShiftActionType } from 'libs/enums';
import { RouteItem, MultiRouteOutput, RoutingOutput, TimeWindow, ShiftActions } from '../../libs/interfaces';
import { RoutePlanRepository } from '../../libs/repositories';
import { addDays, parseISO } from 'date-fns';
import { format } from 'date-fns/fp';

/**
 * SOP threshold in meters for delivery location accuracy
 */
export const SOP_THRESHOLD_METERS = 100;

/**
 * Calculate SOP (Standard Operating Procedure) adherence for a driver's route plan
 * @param routePlan - Record of route items with delivery locations
 * @returns Object containing count of deliveries within SOP and total with GPS data
 */
export function calculateSOPAdherence(routePlan: Record<string, RouteItem>): {
  withinSOP: number;
  totalWithGPS: number;
} {
  let withinSOP = 0;
  let totalWithGPS = 0;

  for (const deliveryId in routePlan) {
    // Skip the kitchen location
    if (deliveryId === 'KITCHEN') {
      continue;
    }

    const routeItem = routePlan[deliveryId];

    // Check if we have GPS data for both locations
    if (routeItem.deliveredAtLocation && routeItem.origin) {
      totalWithGPS++;

      const distance = calculateDistance(routeItem.origin, routeItem.deliveredAtLocation);

      if (distance !== undefined && distance <= SOP_THRESHOLD_METERS) {
        withinSOP++;
      }
    }
  }

  return {
    withinSOP,
    totalWithGPS
  };
}

export function calculateDistance(address: LatLng, deliveredAtLocation?: LatLng): number | undefined {
  if (deliveredAtLocation) {
    // calculate distance between two lat lng points using haversine formula in meters
    const R = 6371e3; // metres
    const lat1Rad = (address.lat * Math.PI) / 180;
    const lat2Rad = (deliveredAtLocation.lat * Math.PI) / 180;
    const deltaLatRad = ((deliveredAtLocation.lat - address.lat) * Math.PI) / 180;
    const deltaLngRad = ((deliveredAtLocation.lng - address.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
  }
}

export function getRouteActionTime(driverActions: ShiftActions[], actionType: ShiftActionType): string | undefined {
  const action = driverActions.find((action) => action.type === actionType);
  if (action) {
    return action.time;
  }
  return undefined;
}

export async function getAssignedRoutes(fileName: string): Promise<MultiRouteOutput> {
  const fileService = new FileService();
  const name = `route-plans/${fileName}/time-window-route.json`;
  logger.info('Getting simulated route file from FileService with name: ', name);
  let simulationOutput: MultiRouteOutput = {
    routes: [
      {
        simulated: {
          route: [],
          metrics: {
            totalWithinWindow: 0,
            duration: 0,
            deliveryDuration: 0,
            performedDeliveries: 0,
            skippedDeliveries: 0
          }
        },
        actual: {
          route: [],
          metrics: {
            totalWithinWindow: 0,
            duration: 0,
            deliveryDuration: 0,
            performedDeliveries: 0,
            skippedDeliveries: 0
          }
        },
        vehicleLabel: ''
      }
    ],
    routingParams: undefined
  };
  const fileData = await fileService.getFile(name);
  if (Buffer.isBuffer(fileData)) {
    simulationOutput = JSON.parse(fileData.toString('utf8'));
  } else if (typeof fileData === 'string') {
    simulationOutput = JSON.parse(fileData);
  }
  return simulationOutput;
}

export function isWithinWindow(window: TimeWindow, deliveredAt: string): boolean {
  if (!window || !deliveredAt) return false;

  const deliveredAtTime = new Date(deliveredAt).getTime();
  // start time can either be window.startTime or window.softStartTime
  const startValue = window.startTime ?? window.softStartTime;
  if (!startValue) return false;
  const startTime = new Date(startValue).getTime();
  // end time can either be window.endTime or window.softEndTime
  const endValue = window.endTime ?? window.softEndTime;
  if (!endValue) return false;
  const endTime = new Date(endValue).getTime();

  return deliveredAtTime >= startTime && deliveredAtTime <= endTime;
}

export async function updateAssignedRoute(fileName: string, updatedData: RoutingOutput): Promise<void> {
  try {
    const fileService = new FileService();
    const name = `route-plans/${fileName}/time-window-route.json`;
    const updatedSimulationData = {
      vehicleLabel: updatedData.vehicleLabel,
      simulated: {
        route: updatedData.simulated.route,
        metrics: updatedData.simulated.metrics
      },
      actual: updatedData.actual,
      routingParams: updatedData.routingParams
    };
    await fileService.putFile(name, JSON.stringify(updatedSimulationData));
    logger.info(`Successfully updated simulation file in S3: ${name}`);
  } catch (error) {
    logger.error('Error updating route plan priorities:', { error });
  }
}

export async function findNextDayRoutePlan(routePlanRepository: RoutePlanRepository, driverId: string, day: string) {
  const nextDay = format('yyyy-MM-dd')(addDays(parseISO(day), 1));
  const routePlan = await routePlanRepository.getByDayIdTime(nextDay, driverId, DeliveryTime.earlyMorning);
  return routePlan;
}
