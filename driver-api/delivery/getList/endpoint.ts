import { withSecrets } from '@calo-backend/middleware';
import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { ObsAlarm, logger, withExceptionAlarm, withValidation } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';

import { Country } from '@calo/types';

import { eventRequestSchema, eventResponseSchema } from './schema';
import GetDeliveryListUseCase from './useCase';
import { makeDelivery } from '../../libs/factories';
import { DeliveryEstimationRepository } from '../../libs/repositories/DDB';
import { toError } from '@libs/errors';
import { DriverApiEvent, GetDeliveriesReq } from '@libs/interfaces';
import { getDeliveriesQuerySchema } from '@libs/schemas';

export const handler = apiV1WithDriver<unknown, unknown, GetDeliveriesReq>()
  .use(
    withValidation({
      request: { schema: eventRequestSchema, safeParse: true },
      httpResponse: { schema: eventResponseSchema, safeParse: true },
    }),
  )
  .use(withExceptionAlarm())
  .handler(async (event: DriverApiEvent) => {
    const rawFilters = event.queryStringParameters ?? {};
    const filters = getDeliveriesQuerySchema.parse(rawFilters);
    const country = event.requestContext.authorizer?.claims['custom:country'] || Country.BH;
    const kitchen = event.requestContext.authorizer?.claims['custom:kitchen'] || `${country}001`;

    const getList = new GetDeliveryListUseCase(
      new EsDeliveryRepository(),
      new DeliveryRepository(),
      new SubscriptionRepository(),
      new DeliveryEstimationRepository(),
      new RoutePlanRepository(),
    );
    try {
      const { deliveries, additionalData } = await getList.exec(event.driverId!, filters, country, kitchen);
      return {
        statusCode: 200,
        body: {
          data: deliveries.map((d) => makeDelivery(d, additionalData[d.sk])),
        },
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      await ObsAlarm.fire({
        name: 'GetDeliveryListUseCase',
        description: 'failed to get deliveries',
        error: err,
        severity: 'ERROR',
        additional: {
          driverId: event.driverId,
          filters,
          country,
          kitchen,
        },
      });
      throw new InternalServerError();
    }
  })
  .use(withSecrets(process.env.OS_SECRET_ARN));
