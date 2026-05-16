import { withSecrets } from '@calo-backend/middleware';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as ESDeliveryRepository } from '@calo-backend/repositories/ES';
import middy from '@middy/core';
import { SQSHandler } from 'aws-lambda';

import HandleDeliveredStatusUseCase from './useCase';
import { HandleDeliveredStatusReq } from '../../../libs/interfaces';

export const handler: SQSHandler = middy(async (event: any) => {
  for (const record of event.Records) {
    const body: HandleDeliveredStatusReq = JSON.parse(record.body);
    const routePlanRepository = new RoutePlanRepository();
    const subscriptionRepository = new SubscriptionRepository();
    const deliveryRepository = new DeliveryRepository();
    const esDeliveryRepository = new ESDeliveryRepository();
    const useCase = new HandleDeliveredStatusUseCase(routePlanRepository, subscriptionRepository, deliveryRepository, esDeliveryRepository);
    await useCase.exec(body);
  }
}).use(withSecrets(process.env.OS_SECRET_ARN));
