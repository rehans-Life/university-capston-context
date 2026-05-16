import { withSecrets } from '@calo-backend/middleware';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository } from '@calo-backend/repositories/ES';
import middy from '@middy/core';
import sqsBatch from '@middy/sqs-partial-batch-failure';
import { SQSHandler, SQSEvent } from 'aws-lambda';
import { LocationRepository } from 'src/libs/repositories/API';

import RecalculateETAUseCase from './useCase';

export const handler: SQSHandler = middy<SQSEvent>(async (event: SQSEvent) => {
  const routePlanRepo = new RoutePlanRepository();
  const deliveryRepo = new DeliveryRepository();
  const locationRepo = new LocationRepository(process.env.LOCATION_SERVICE_URL!);
  const recalculateETAUseCase = new RecalculateETAUseCase(routePlanRepo, deliveryRepo, locationRepo);

  const recordPromises = event.Records.map(async (record: { body: string }) => {
    const { routeId }: { routeId: string } = JSON.parse(record.body);

    return recalculateETAUseCase.exec(routeId);
  });

  return await Promise.allSettled(recordPromises);
})
  .use(withSecrets(process.env.OS_SECRET_ARN))
  .use(sqsBatch());
