import middleware, { withSecrets } from '@calo-backend/middleware';
import { KitchenRepository } from '@calo-backend/repositories/DDB';
import sendMessage from '@calo-backend/sendMessage';
import { ScheduledHandler } from 'aws-lambda';
import { format } from 'date-fns/fp';
import { RoutePlanRepository } from 'src/libs/repositories/ES';

import { TimezoneService } from '@calo/services';
import { Kitchen } from '@calo/types';

import { ShiftActionType } from '@libs/driver-types';

// @ts-ignore
export const handler: ScheduledHandler = middleware(async () => {
  const routePlanRepository = new RoutePlanRepository();

  const kitchenRepo = new KitchenRepository();
  const kitchens = await kitchenRepo.getList();
  const filteredKitchens = kitchens.filter((kitchen) => !kitchen.sk.includes('000'));

  for (const kitchen of filteredKitchens) {
    const date = TimezoneService.getKitchenDate(kitchen.sk as Kitchen);
    const day = format('yyyy-MM-dd')(date);
    const routePlans = await routePlanRepository.getRoutePlanList({
      day: { gte: day, lte: day },
      kitchen: kitchen.sk as Kitchen,
    });

    const routeIds = routePlans
      .filter(
        (routePlan) =>
          routePlan.driverActions?.some((action) => action.type === ShiftActionType.STARTED_DELIVERING) &&
          !routePlan.driverActions?.some((action) => action.type === ShiftActionType.FINISHED_SHIFT) &&
          routePlan.totalDeliveries - routePlan.deliveredDeliveries > 1,
      )
      .map((routePlan) => {
        console.log(
          `Driver: ${routePlan.driver?.driverName || 'Unknown'}, Route ID: ${routePlan.id} deliveryTime ${routePlan.time}`,
        );
        return routePlan.id;
      });

    if (!routeIds || routeIds.length === 0) {
      continue;
    }

    let sqsPromises: Promise<any>[] = [];

    for (let routeId of routeIds) {
      const sqsPromise = sendMessage(
        {
          routeId: routeId,
        },
        {
          QueueUrl: process.env.RECALCULATE_ETA_QUEUE_URL!,
        },
      );
      sqsPromises.push(sqsPromise);
    }

    await Promise.allSettled(sqsPromises);
  }
}).use(withSecrets(process.env.OS_SECRET_ARN));
