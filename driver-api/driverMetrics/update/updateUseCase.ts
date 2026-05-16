import { RoutePlanEntity } from '@calo-backend/entities/DDB';
import fireEvent from '@calo-backend/fireEvent';
import { RouteItem } from '@calo-backend/interfaces';
import { DeliveryRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import sendMessage from '@calo-backend/sendMessage';
import { PackagesService } from '@calo-backend/services/packages';
import { ObsAlarm, logger } from '@teamcalo/core';
import { chunk, keyBy, orderBy, uniqBy } from 'lodash-es';
import { cloneDeep } from 'lodash-es';
import { makeDriverMetrics } from 'src/libs/factories';
import {
  PreferredRouteItemWithDeliveryTime,
  RoutePoint,
  GetCountryConfigRes,
  TimeSlotConfig,
} from 'src/libs/interfaces';
import { LocationRepository } from 'src/libs/repositories/API';

import { DDeliveryStatus, DeliveryStatus, Kitchen } from '@calo/types';

import { AutoSlotAssignmentHelper } from './utils/autoSlotAssignmentHelper';
import { syncEstimations } from './utils/helpers';
import { fetchRoutePlan, generateRoute } from '../ETA/utils';
import { PreferredRouteItem, ShiftActionType, UpdateDriverMetricsReq } from '@libs/driver-types';
import { toError } from '@libs/errors';

class UpdateDriverMetricsUseCase {
  constructor(
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly locationRepository: LocationRepository,
    private readonly deliveryRepository: DeliveryRepository,
  ) {}

  async exec(
    id: string,
    { driverActions, preferredRoute, driverPosition, autoBalancedTimeSlots }: UpdateDriverMetricsReq,
  ) {
    const plan = await fetchRoutePlan(this.routePlanRepository, id);
    let eta;

    if (
      (plan.kitchen === Kitchen.BH1 || plan.kitchen === Kitchen.SA2 || plan.kitchen === Kitchen.AE1) &&
      !plan.canStartShift
    ) {
      throw 'not allowed';
    }
    logger.debug(`driverId: ${plan.driver.id}`);
    logger.debug(`driverActions: ${JSON.stringify(driverActions)}`);
    logger.debug(`preferredRoute: ${JSON.stringify(preferredRoute)}`);

    if (preferredRoute) {
      const orderedPreferredRoute = orderBy(preferredRoute, 'priority');
      this.adjustTheBufferTime(orderedPreferredRoute);
      const deliveryStartTime = (driverActions ?? []).find(
        (action) => action.type === ShiftActionType.STARTED_DELIVERING,
      )!.time;
      const newRoutePlan: RouteItem[] = orderedPreferredRoute.map((i) => {
        const rp = plan.routePlan[i.id];
        if (i.origin) {
          if (rp && rp.origin.lat === i.origin.lat && rp.origin.lng === i.origin.lng) {
            return rp;
          } else {
            return {
              id: i.id,
              isMatched: false,
              origin: i.origin,
              priority: i.priority,
              travelTime: 0,
            };
          }
        } else {
          //temp solution for older app versions
          return rp;
        }
      });
      plan.set({
        routePlan: keyBy(newRoutePlan, 'id'),
      });
      const routePoints: RoutePoint[] = orderedPreferredRoute.map(({ id, groupBufferTime, priority, origin }) => ({
        id,
        ...(plan.routePlan[id]?.origin || origin),
        bufferTime: groupBufferTime,
        priority,
      }));

      const departurePosition = driverPosition ?? plan.kitchenPosition;
      logger.debug('Departure point is a ', `${driverPosition ? 'driver' : 'kitchen'} Position`);

      let preferredRouteWithTime: PreferredRouteItemWithDeliveryTime[] = [];
      try {
        const response = await generateRoute(
          this.locationRepository,
          departurePosition,
          routePoints,
          deliveryStartTime,
        );

        logger.debug(`orderedPreferredRoute: ${JSON.stringify(orderedPreferredRoute)}`);
        if (response) {
          const preferredRouteDict = keyBy(orderedPreferredRoute, 'id');

          preferredRouteWithTime = response.map(({ id, eta }) => ({ ...preferredRouteDict[id], deliveryTime: eta }));

          let routePlanWithDeliveryTime = cloneDeep(plan.routePlan);
          logger.debug(`preferredRouteWithTime: ${JSON.stringify(preferredRouteWithTime)}`);
          for (const calculation of response) {
            if (routePlanWithDeliveryTime[calculation.id]) {
              routePlanWithDeliveryTime[calculation.id].toBeDeliveredAt = calculation.eta;
              routePlanWithDeliveryTime[calculation.id].priority = preferredRouteDict[calculation.id]?.priority;
              routePlanWithDeliveryTime[calculation.id].groupBufferTime =
                preferredRouteDict[calculation.id]?.groupBufferTime;
            }
          }
          plan.set({ routePlan: routePlanWithDeliveryTime, startingPosition: driverPosition });
        }
        try {
          await fireEvent(process.env.GENERATE_ROUTE_TOPIC_ARN!, {
            id,
            departurePosition,
            orderedPreferredRoute,
          });
        } catch (error) {
          logger.error(toError(error).message);
        }
      } catch (error) {
        logger.error('calculateRouteError', toError(error).message);
      }
      eta = syncEstimations(
        // @ts-ignore SOLVE DeliveryTime
        preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
        plan.day,
      );

      await sendMessage(
        {
          preferredRoute: preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
          day: plan.day,
          deliveryTime: plan.time,
        },
        {
          QueueUrl: process.env.SYNC_ETA_QUEUE_URL!,
        },
      );
    } else {
      const deliveryStart = (driverActions ?? []).find((action) => action.type === ShiftActionType.STARTED_DELIVERING);
      if (deliveryStart) {
        const deliveryStartTime = deliveryStart.time;

        const deliveryIds = Object.keys(plan.routePlan);
        logger.debug(`deliveryIds: ${JSON.stringify(deliveryIds)}`);

        // fetch deliveries
        const deliveries = await this.deliveryRepository.batchFindByIds(deliveryIds);

        const deliveryMap = keyBy(deliveries, 'id');

        let preferredRoute = Object.values(plan.routePlan).map((item) => ({
          id: item.id,
          userId: deliveryMap[item.id]?.userId || item.id,
          priority: item.priority || 0,
          groupBufferTime: item.groupBufferTime,
          origin: item.origin,
        }));
        const orderedPreferredRoute = orderBy(preferredRoute, 'priority');
        this.adjustTheBufferTime(orderedPreferredRoute);

        const routePoints: RoutePoint[] = orderedPreferredRoute.map(({ id, groupBufferTime, priority, origin }) => ({
          id,
          ...(plan.routePlan[id]?.origin || origin),
          bufferTime: groupBufferTime,
          priority,
        }));

        const departurePosition = driverPosition ?? plan.kitchenPosition;
        logger.debug('Departure point is a ', `${driverPosition ? 'driver' : 'kitchen'} Position`);

        let preferredRouteWithTime: PreferredRouteItemWithDeliveryTime[] = [];
        try {
          const response = await generateRoute(
            this.locationRepository,
            departurePosition,
            routePoints,
            deliveryStartTime,
          );

          logger.debug(`orderedPreferredRoute: ${JSON.stringify(orderedPreferredRoute)}`);
          if (response) {
            const preferredRouteDict = keyBy(orderedPreferredRoute, 'id');

            preferredRouteWithTime = response.map(({ id, eta }) => ({
              ...preferredRouteDict[id],
              deliveryTime: eta,
            }));

            let routePlanWithDeliveryTime = cloneDeep(plan.routePlan);
            logger.debug(`preferredRouteWithTime: ${JSON.stringify(preferredRouteWithTime)}`);
            for (const calculation of response) {
              if (routePlanWithDeliveryTime[calculation.id]) {
                routePlanWithDeliveryTime[calculation.id].toBeDeliveredAt = calculation.eta;
                routePlanWithDeliveryTime[calculation.id].priority = preferredRouteDict[calculation.id]?.priority;
                routePlanWithDeliveryTime[calculation.id].groupBufferTime =
                  preferredRouteDict[calculation.id]?.groupBufferTime;
              }
            }
            plan.set({ routePlan: routePlanWithDeliveryTime, startingPosition: driverPosition });
          }
          try {
            await fireEvent(process.env.GENERATE_ROUTE_TOPIC_ARN!, {
              id,
              departurePosition,
              orderedPreferredRoute,
            });
          } catch (error) {
            logger.error(toError(error).message);
          }
        } catch (error) {
          logger.error('calculateRouteError', toError(error).message);
        }
        eta = syncEstimations(
          // @ts-ignore SOLVE DeliveryTime
          preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
          plan.day,
        );
        await sendMessage(
          {
            preferredRoute: preferredRouteWithTime.length > 0 ? preferredRouteWithTime : orderedPreferredRoute,
            day: plan.day,
            deliveryTime: plan.time,
          },
          {
            QueueUrl: process.env.SYNC_ETA_QUEUE_URL!,
          },
        );
      }
    }

    if (autoBalancedTimeSlots) {
      // Assign balanced time slots to route items when the shift starts AND enabled sub-slots exist for this shift time
      const isStartingShift = (driverActions ?? []).some((a) => a.type === ShiftActionType.STARTED_SHIFT);
      if (isStartingShift) {
        try {
          const config = await this.fetchDeliveryConfig(plan);
          if (config) {
            const timeConfig = config.delivery?.timings;
            const configSlots = ((timeConfig || []).find((t) => t.id === plan.time)?.slots || []).filter(
              (s: TimeSlotConfig) => s?.enabled,
            );
            if (configSlots.length > 0) {
              await this.assignBalancedTimeSlots(plan, config);
            }
          }
        } catch (error) {
          logger.error('assignBalancedTimeSlots error', toError(error).message);
        }
      }
    }

    plan.set({ driverActions: uniqBy(driverActions, 'type') });
    await this.routePlanRepository.update(plan);

    const shiftJustStarted =
      plan.driverActions?.length === 1 && plan.driverActions[0].type === ShiftActionType.STARTED_SHIFT;
    if (shiftJustStarted) {
      // Remove the kitchen from the priority list, to have a clean list of delivery ids
      const filteredDeliveryIds = plan.priority.filter((id) => id !== 'KITCHEN');

      const deliveries = await this.deliveryRepository.batchFindByIds(filteredDeliveryIds);

      const excludedStatuses = [DeliveryStatus.paused, DeliveryStatus.cancelled, DeliveryStatus.suspended];

      let deliveriesToUpdate = deliveries.filter(
        (delivery) =>
          delivery.deliveryStatus !== DDeliveryStatus.outForDelivery && !excludedStatuses.includes(delivery.status),
      );

      deliveriesToUpdate = uniqBy(deliveriesToUpdate, 'sk');

      for (const delivery of deliveriesToUpdate) {
        delivery.set({
          deliveryStatus: DDeliveryStatus.outForDelivery,
        });
      }

      const deliveryChunks = chunk(deliveriesToUpdate, 25);
      for (const chunk of deliveryChunks) {
        try {
          await this.deliveryRepository.batchUpdate(chunk);
        } catch (error) {
          await ObsAlarm.fire({
            name: 'UpdateDriverMetricsUseCase',
            description: `Error updating delivery status to outForDelivery for deliveries: ${chunk.map((d) => d?.sk).join(', ')} for driver:${plan?.driver?.driverName} ${plan?.driver?.id} on routeId: ${plan?.sk}`,
            error: toError(error),
            severity: 'ERROR',
          });
        }
      }
    }

    return {
      driverMetrics: makeDriverMetrics(true, plan.startingTime, plan),
      eta,
    };
  }

  private async fetchDeliveryConfig(plan: RoutePlanEntity): Promise<GetCountryConfigRes | undefined> {
    try {
      const packagesService = new PackagesService(process.env.PACKAGES_SERVICE_URL!);
      const response = await packagesService.getCountryConfig({
        country: plan.country,
        lat: plan.kitchenPosition.lat,
        lng: plan.kitchenPosition.lng,
        version: 2,
        configKeys: ['delivery'],
      });
      if (response.isLeft()) return undefined;
      return response.value.getValue();
    } catch (error) {
      logger.debug('fetchDeliveryConfig error', toError(error).message);
      return undefined;
    }
  }

  private async assignBalancedTimeSlots(plan: RoutePlanEntity, config: GetCountryConfigRes) {
    const filteredDeliveryIds = (plan.priority || []).filter((id: string) => id !== 'KITCHEN');
    if (filteredDeliveryIds.length === 0) return;

    const newRoutePlan = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
      plan,
      config,
      filteredDeliveryIds,
      plan.routePlan,
    );

    plan.set({ routePlan: newRoutePlan });
  }

  private adjustTheBufferTime(preferredRoute: PreferredRouteItem[]) {
    for (const item of preferredRoute) {
      if (item.groupBufferTime) {
        item.groupBufferTime = 0;
      }
    }
  }
}

export default UpdateDriverMetricsUseCase;
