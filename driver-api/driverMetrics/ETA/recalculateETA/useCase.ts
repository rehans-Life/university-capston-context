import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository } from '@calo-backend/repositories/ES';
import sendMessage from '@calo-backend/sendMessage';
import { InternalServerError } from 'http-errors';
import { cloneDeep, difference, keyBy, orderBy } from 'lodash-es';
import { PreferredRouteItemWithDeliveryTime, RoutePoint } from 'src/libs/interfaces';
import { LocationRepository } from 'src/libs/repositories/API';

import { fetchRoutePlan, generateRoute } from '../utils';
import { LatLng, PreferredRouteItem } from '@libs/driver-types';

class RecalculateETAUseCase {
  constructor(
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly deliveryRepository: DeliveryRepository,
    private readonly locationRepository: LocationRepository,
  ) {}

  async exec(id: string) {
    const routePlan = await fetchRoutePlan(this.routePlanRepository, id);

    const lastDeliveredDelivery = await this.deliveryRepository.getLastDelivered({ ids: routePlan.deliveredPositions });

    if (!lastDeliveredDelivery) {
      return;
    }

    const undeliveredDeliveryIDs = difference(routePlan.priority, routePlan.deliveredPositions);

    // sometimes 'KITCHEN' is included in routePlan.priority, so we need to filter it out
    const filteredUndeliveredDeliveryIds = undeliveredDeliveryIDs.filter((id) => id !== 'KITCHEN');

    const undeliveredDeliveries = await this.deliveryRepository.getDeliveries({ ids: filteredUndeliveredDeliveryIds });
    const keyedDeliveries = keyBy(undeliveredDeliveries.data, 'id');

    let routePoints: RoutePoint[] = [];
    let preferredRouteItem: PreferredRouteItem[] = [];

    for (let deliveryId of filteredUndeliveredDeliveryIds) {
      if (!routePlan.routePlan[deliveryId]) {
        continue;
      }
      routePoints.push({
        id: deliveryId,
        priority: routePlan.routePlan[deliveryId].priority,
        lat: routePlan.routePlan[deliveryId].origin.lat,
        lng: routePlan.routePlan[deliveryId].origin.lng,
      });
      preferredRouteItem.push({
        id: deliveryId,
        priority: routePlan.routePlan[deliveryId].priority,
        origin: routePlan.routePlan[deliveryId].origin,
        userId: keyedDeliveries[deliveryId].userId,
      });
    }

    const orderedRoutePoints = orderBy(routePoints, 'priority');
    const time = new Date().toISOString();

    const lastDeliveredPosition: LatLng = {
      lat: lastDeliveredDelivery.deliveryAddress.lat,
      lng: lastDeliveredDelivery.deliveryAddress.lng,
    };

    let preferredRouteWithTime: PreferredRouteItemWithDeliveryTime[] = [];

    const response = await generateRoute(this.locationRepository, lastDeliveredPosition, orderedRoutePoints, time);
    const orderedPreferredRoute = orderBy(preferredRouteItem, 'priority');

    if (!response) {
      throw new InternalServerError('Failed to generate route');
    }

    const preferredRouteDict = keyBy(orderedPreferredRoute, 'id');

    preferredRouteWithTime = response.map(({ id, eta }) => ({ ...preferredRouteDict[id], deliveryTime: eta }));

    let routePlanWithDeliveryTime = cloneDeep(routePlan.routePlan);
    for (const routeSegmentEtaData of response) {
      if (routePlanWithDeliveryTime[routeSegmentEtaData.id]) {
        routePlanWithDeliveryTime[routeSegmentEtaData.id].toBeDeliveredAt = routeSegmentEtaData.eta;
      }
    }
    routePlan.set({ routePlan: routePlanWithDeliveryTime });

    await sendMessage(
      {
        preferredRoute: preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
        day: routePlan.day,
        deliveryTime: routePlan.time,
      },
      {
        QueueUrl: process.env.SYNC_ETA_QUEUE_URL!,
      },
    );

    await this.routePlanRepository.update(routePlan);
  }
}

export default RecalculateETAUseCase;
