import { addMinutes, formatISO } from 'date-fns';
import { uniqBy } from 'lodash-es';

import {
  RouteCalculationProps,
  RouteCalculationRequest,
  RoutePoint,
  RoutePointWithEta
} from '../../../libs/interfaces';
import RouteService from '../../../libs/services/RouteService';

class GenerateRouteUseCase {
  constructor(private readonly routeService: RouteService) {}

  async exec({ departurePosition, routePoints, deliveryStartTime, optimize }: RouteCalculationRequest) {
    const routePointsWithUniquePriority = uniqBy(routePoints, 'priority');
    const getRouteWaypoints = this.getRouteWaypoints(routePointsWithUniquePriority);
    const route: RouteCalculationProps = {
      DeparturePosition: [departurePosition.lng, departurePosition.lat],
      WaypointPositions: getRouteWaypoints,
      DestinationPosition: [departurePosition.lng, departurePosition.lat],
      DepartNow: true,
      OptimizeRoute: optimize ?? false,
      DepartureTime: deliveryStartTime
    };
    const response = await this.routeService.generateGoogleRoute(route);
    console.log('response', JSON.stringify(response, null, 2));
    const responseWithAllPoints = this.populateRoutePointsWithAllPoints(
      response,
      routePoints,
      routePointsWithUniquePriority
    );

    let routePointsWithETA: RoutePointWithEta[] = [];

    let deliveryStartTimeDate = new Date(deliveryStartTime);
    console.log('starting points', getRouteWaypoints);
    console.log('routePoints', routePoints);
    console.log('responseWithAllPoints', JSON.stringify(responseWithAllPoints, null, 2));

    for (const item of responseWithAllPoints) {
      const route = routePoints[item.order - 1];
      if (!route) {
        console.log('route not found', item);
        continue;
      }
      const pointEta = addMinutes(deliveryStartTimeDate, item?.duration ?? 0);
      routePointsWithETA.push({ ...route, eta: formatISO(pointEta), priority: item.priority! });
      deliveryStartTimeDate = pointEta;
    }

    console.log('with eta', routePointsWithETA);

    return routePointsWithETA;
  }

  private getRouteWaypoints(routePoints: { id: string; lat: number; lng: number; priority: number }[]) {
    return routePoints.map(({ lng, lat }) => [lng, lat]);
  }

  private populateRoutePointsWithAllPoints(
    response: { order: number; duration: number; priority?: number }[],
    routePoints: RoutePoint[],
    routePointsWithUniquePriority: RoutePoint[]
  ) {
    const durationByPriority = new Map<number, number>();
    for (const r of response) {
      const waypointIndex = r.order - 1;
      const waypoint = routePointsWithUniquePriority[waypointIndex];
      if (waypoint !== undefined) {
        durationByPriority.set(waypoint.priority, r.duration);
      }
    }

    let globalOrder = 1;
    const seenPriorities = new Set<number>();
    return routePoints.map((routePoint) => {
      const isFirstInPriorityGroup = !seenPriorities.has(routePoint.priority);
      seenPriorities.add(routePoint.priority);
      const duration = isFirstInPriorityGroup ? (durationByPriority.get(routePoint.priority) ?? 0) : 0;

      return {
        priority: routePoint.priority,
        order: globalOrder++,
        duration
      };
    });
  }
}

export default GenerateRouteUseCase;
