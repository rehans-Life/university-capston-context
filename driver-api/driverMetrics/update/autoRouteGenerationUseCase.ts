//  @ts-nocheck
import { DataType } from '@calo-backend/enums';
import fireEvent from '@calo-backend/fireEvent';
import { RouteItem } from '@calo-backend/interfaces';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import sendMessage from '@calo-backend/sendMessage';
import { keyBy, uniqBy } from 'lodash-es';

import { Kitchen } from '@calo/types';

import { syncEstimations } from './utils/helpers';
import { makeDriverMetrics } from '../../libs/factories';
import { PreferredRouteItemWithDeliveryTime, RoutePoint } from '../../libs/interfaces';
import { LocationRepository } from '../../libs/repositories/API';
import { PreferredRouteItem, ShiftActionType, UpdateDriverMetricsReq } from '@libs/driver-types';

class UpdateDriverMetricsWithAutoRouteGenerationUseCase {
  constructor(
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly locationRepository: LocationRepository,
  ) {}

  async exec(id: string, { driverActions, preferredRoute: routeItems, driverPosition }: UpdateDriverMetricsReq) {
    const plan = await this.routePlanRepository.find({ id: DataType.routePlanNew, sk: id });
    let eta;
    if (!plan) {
      throw 'not found';
    }

    if (
      (plan.kitchen === Kitchen.BH1 || plan.kitchen === Kitchen.SA2 || plan.kitchen === Kitchen.AE1) &&
      !plan.canStartShift
    ) {
      throw 'not allowed';
    }
    console.log('driverId', plan.driver.id);
    console.log('driverActions', JSON.stringify(driverActions));
    console.log('preferredRoute', JSON.stringify(routeItems));

    if (
      routeItems ??
      driverActions?.some((action) => action.type === ShiftActionType.STARTED_DELIVERING && action.autoGenerateRoute)
    ) {
      const deliveryStartTime = (driverActions ?? []).find(
        (action) => action.type === ShiftActionType.STARTED_DELIVERING,
      )!.time;
      console.log('deliveryStartTime', deliveryStartTime);

      const routePoints = this.preferredRouteItemsToRoutePoints(routeItems!);
      console.log('routePoints', routePoints);

      const route = await this.locationRepository.generateRoute({
        departurePosition: driverPosition ?? plan.kitchenPosition,
        routePoints,
        deliveryStartTime,
        optimize: true,
      });
      console.log('route', route);

      const newRoutePlan: RouteItem[] = route.map((i) => {
        const rp = plan.routePlan[i.id];
        if (rp && rp.origin.lat === i.lat && rp.origin.lng === i.lng) {
          return { ...rp, priority: i.priority, toBeDeliveredAt: i.eta, travelTime: 0 };
        } else {
          return {
            id: i.id,
            isMatched: false,
            origin: { lat: i.lat, lng: i.lng },
            priority: i.priority,
            toBeDeliveredAt: i.eta,
            travelTime: 0,
          };
        }
      });
      console.log('newRoutePlan', newRoutePlan);

      plan.set({ routePlan: keyBy(newRoutePlan, 'id'), startingPosition: driverPosition });

      const orderedPreferredRoute = this.routePointsToPreferredRouteItems(route, routeItems!);
      console.log('orderedPreferredRoute', orderedPreferredRoute);

      let preferredRouteWithTime: PreferredRouteItemWithDeliveryTime[] = [];
      try {
        await fireEvent(process.env.GENERATE_ROUTE_TOPIC_ARN!, {
          id,
          departurePosition: driverPosition ?? plan.kitchenPosition,
          orderedPreferredRoute,
        });
      } catch (error) {
        console.log(error);
      }
      eta = syncEstimations(
        // @ts-ignore SOLVE DeliveryTime
        preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
        plan.day,
      );
      console.log('eta', eta);

      await sendMessage(
        {
          preferredRoute: preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
          day: plan.day,
        },
        {
          QueueUrl: process.env.SYNC_ETA_QUEUE_URL!,
        },
      );
    }
    plan.set({ driverActions: uniqBy(driverActions, 'type') });
    await this.routePlanRepository.update(plan);
    return {
      driverMetrics: makeDriverMetrics(true, plan.startingTime, plan),
      eta,
    };
  }

  private preferredRouteItemsToRoutePoints(preferredRoute: PreferredRouteItem[]): RoutePoint[] {
    return preferredRoute.map(({ id, origin, groupBufferTime, priority }) => ({
      id,
      ...origin,
      bufferTime: groupBufferTime,
      priority,
    }));
  }

  private routePointsToPreferredRouteItems(
    routePoints: RoutePoint[],
    routeItemsInput: PreferredRouteItem[],
  ): PreferredRouteItem[] {
    return routePoints.map(({ id, lat, lng, bufferTime, priority }) => ({
      id,
      origin: { lat, lng },
      groupBufferTime: bufferTime,
      priority,
      userId: routeItemsInput.find((i) => i.id === id)?.userId!,
    }));
  }
}

export default UpdateDriverMetricsWithAutoRouteGenerationUseCase;
