import { DeliveryTime } from '@calo-backend/enums';
import middy from '@middy/core';
import { logger } from '@teamcalo/core';
import { SQSHandler } from 'aws-lambda';

import UpdateDriverMetricsUseCase from './useCase';
import { PreferredRouteItemWithDeliveryTime } from '../../../libs/interfaces';
import { DeliveryEstimationRepository } from '../../../libs/repositories/DDB';

export const handler: SQSHandler = middy(async (event: any) => {
  for (const record of event.Records) {
    const {
      preferredRoute,
      day,
      deliveryTime,
    }: { preferredRoute: PreferredRouteItemWithDeliveryTime[]; day: string; deliveryTime: DeliveryTime } = JSON.parse(
      record.body,
    );
    logger.debug(`preferredRoute ${JSON.stringify(preferredRoute)}`);
    logger.debug(`day: ${day}`);
    const deliveryEtaRepo = new DeliveryEstimationRepository();
    const syncETA = new UpdateDriverMetricsUseCase(deliveryEtaRepo);
    await syncETA.exec(preferredRoute, day, deliveryTime);
  }
});
