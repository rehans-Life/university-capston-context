import { RoutePlanRepository } from '../../../libs/repositories';
import { NotFound } from 'http-errors';
import { RouteItem } from 'libs/interfaces';
import { AutoRouteItem, RoutingOutput, MultiRouteOutput } from '../../../libs/interfaces';

import { DeliveryRepository } from 'libs/repositories/ES';
import { calculateDistance, getRouteActionTime as getActionTime, getAssignedRoutes, isWithinWindow } from '../helper';
import { logger } from '@teamcalo/core';
import { ShiftActionType } from 'libs/enums';
import { buildComplianceAnalysis, RouteComplianceAnalysis } from '../routeComplianceAnalysis';

export interface AnalyzeCompletedSimulatedRouteOutput extends RoutingOutput {
  compliance: RouteComplianceAnalysis;
}

class AnalyzeCompletedSimulatedRouteUseCase {
  constructor(
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly deliveryRepository: DeliveryRepository
  ) {}
  async exec(id: string): Promise<AnalyzeCompletedSimulatedRouteOutput> {
    const routePlan = await this.routePlanRepository.findById(id);
    if (!routePlan) {
      throw new NotFound('Route plan not found');
    }

    const plannedDeliveriesIds = routePlan.priority.filter((d) => !d.startsWith('KITCHEN'));

    const { rows: deliveries } = await this.deliveryRepository.getDeliveriesForDriverMetrics({
      ids: plannedDeliveriesIds
    });

    if (!routePlan.assignedRoutePlan) {
      throw new Error('Assigned route plan not found for route plan id: ' + id);
    }
    const simulationOutput = await getAssignedRoutes(routePlan.assignedRoutePlan!);
    logger.info('Fetched simulated route data: ', { simulationOutput });

    // Normalize: data can come as { routes: [...] } (MultiRouteOutput) or as a single route (RoutingOutput)
    let firstRoute: MultiRouteOutput['routes'][0] | RoutingOutput;
    if (
      Array.isArray((simulationOutput as MultiRouteOutput).routes) &&
      (simulationOutput as MultiRouteOutput).routes.length > 0
    ) {
      // Match the route by vehicleLabel (which corresponds to driver.id)
      firstRoute =
        (simulationOutput as MultiRouteOutput).routes.find((r) => r.vehicleLabel === routePlan.driver.id) ??
        (simulationOutput as MultiRouteOutput).routes[0];
    } else {
      // Legacy format: simulationOutput is a single RoutingOutput-like route object
      firstRoute = simulationOutput as unknown as RoutingOutput;
    }

    if (!firstRoute?.simulated?.route) {
      logger.error('No simulated route found in simulation output', {
        routePlanId: id,
        assignedRoutePlan: routePlan.assignedRoutePlan,
        driverId: routePlan.driver.id,
        hasRoutes: !!simulationOutput.routes,
        routesLength: simulationOutput.routes?.length,
        hasSimulated: !!firstRoute?.simulated
      });
      throw new Error(`No simulated route found in simulation output for route plan id: ${id}`);
    }

    const simulationRoute = firstRoute.simulated.route;

    let actualRoute: AutoRouteItem[] = [];
    // sort deliveries by deliveries.deliveredAt
    deliveries.sort((a, b) => {
      if (!a.deliveredAt && !b.deliveredAt) return 0;
      if (!a.deliveredAt) return 1;
      if (!b.deliveredAt) return -1;
      const dateA = new Date(a.deliveredAt).getTime();
      const dateB = new Date(b.deliveredAt).getTime();
      return dateA - dateB;
    });

    for (const [i, delivery] of deliveries.entries()) {
      const routePlanDelivery = routePlan.routePlan[delivery.id] as RouteItem;
      const simulatedDelivery = simulationRoute.find(
        (item: AutoRouteItem) => item.id === delivery.id || item.deliveryId === delivery.id
      );
      if (routePlanDelivery && simulatedDelivery) {
        actualRoute.push({
          id: delivery.id,
          priority: i + 1,
          name: delivery.name,
          time: delivery.time,
          lat: delivery.deliveryAddress?.lat,
          lng: delivery.deliveryAddress?.lng,
          deliveredAt: delivery.deliveredAt,
          deliveredLocationDistance: calculateDistance(delivery.deliveryAddress, routePlanDelivery.deliveredAtLocation),
          avgDeliveredAt: simulatedDelivery?.avgDeliveredAt,
          withinWindow:
            simulatedDelivery.timeWindows && delivery.deliveredAt
              ? isWithinWindow(simulatedDelivery.timeWindows[0], delivery.deliveredAt)
              : false
        });
      } else {
        logger.warn('Route plan delivery or simulated delivery data not found for deliveryId:', {
          deliveryId: delivery.id
        });
      }
    }

    const actualStartTime = getActionTime(routePlan.driverActions, ShiftActionType.STARTED_SHIFT);
    let actualEndTime = getActionTime(routePlan.driverActions, ShiftActionType.FINISHED_SHIFT);
    const actualFirstDeliveryTime = actualRoute[0]?.deliveredAt;
    let actualLastDeliveryTime = actualRoute[actualRoute.length - 1]?.deliveredAt;

    if (!actualLastDeliveryTime) {
      // find last delivery where deliveredAt is defined
      const lastDelivery = [...actualRoute].reverse().find((d) => d.deliveredAt);
      if (lastDelivery && lastDelivery.deliveredAt) {
        actualLastDeliveryTime = lastDelivery.deliveredAt;
      }
    }

    if (!actualEndTime) {
      logger.warn('Actual end time not found from FINISHED_SHIFT, using last delivery time as end time');
      actualEndTime = actualLastDeliveryTime;
    }

    const actualRouteTime =
      actualStartTime && actualEndTime
        ? (new Date(actualEndTime).getTime() - new Date(actualStartTime).getTime()) / (1000 * 60)
        : 0;

    const actualDeliveryDuration =
      actualFirstDeliveryTime && actualLastDeliveryTime
        ? (new Date(actualLastDeliveryTime).getTime() - new Date(actualFirstDeliveryTime).getTime()) / (1000 * 60)
        : 0;

    const kitchenPickup = {
      id: 'KITCHEN_PICKUP',
      name: 'Kitchen',
      priority: 0,
      lat: routePlan.kitchenPosition.lat,
      lng: routePlan.kitchenPosition.lng,
      deliveredAt: getActionTime(routePlan.driverActions, ShiftActionType.STARTED_SHIFT)
    } as AutoRouteItem;

    const kitchenDropoff = {
      id: 'KITCHEN_DROPOFF',
      name: 'Kitchen',
      priority: actualRoute.length + 1,
      lat: routePlan.kitchenPosition.lat,
      lng: routePlan.kitchenPosition.lng,
      deliveredAt: getActionTime(routePlan.driverActions, ShiftActionType.FINISHED_SHIFT)
    } as AutoRouteItem;

    if (simulationOutput && simulationOutput.routingParams && simulationOutput.routingParams.kitchenLocation) {
      logger.info('Using kitchen location from simulation output routing params', {
        kitchenLocation: simulationOutput.routingParams.kitchenLocation
      });
      kitchenPickup.lat = simulationOutput.routingParams.kitchenLocation.lat;
      kitchenPickup.lng = simulationOutput.routingParams.kitchenLocation.lng;
      kitchenDropoff.lat = simulationOutput.routingParams.kitchenLocation.lat;
      kitchenDropoff.lng = simulationOutput.routingParams.kitchenLocation.lng;
    }

    actualRoute = [kitchenPickup, ...actualRoute];

    if (simulationOutput && simulationOutput.routingParams && simulationOutput.routingParams.endAtKitchen) {
      actualRoute.push(kitchenDropoff);
    }

    const compliance = buildComplianceAnalysis(simulationRoute, actualRoute, plannedDeliveriesIds.length);

    return {
      simulated: firstRoute.simulated,
      actual: {
        route: actualRoute,
        metrics: {
          duration: actualRouteTime,
          deliveryDuration: actualDeliveryDuration,
          performedDeliveries: deliveries.filter((d) => d.deliveredAt).length,
          skippedDeliveries: deliveries.filter((d) => !d.deliveredAt).length,
          totalWithinWindow: actualRoute.filter((d) => d.withinWindow).length
        }
      },
      vehicleLabel: firstRoute.vehicleLabel,
      compliance
    };
  }
}

export default AnalyzeCompletedSimulatedRouteUseCase;
