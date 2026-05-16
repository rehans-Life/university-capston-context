import { DeliveryTime } from '@calo-backend/enums';
import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { ObsAlarm, logger, withExceptionAlarm, withValidation } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';

import { Country } from '@calo/types';

import { eventRequestSchema, eventResponseSchema } from './schema';
import GetDriverMetricsUseCase from './useCase';
import { toError } from '@libs/errors';
import { DriverApiEvent } from '@libs/interfaces';

export const handler = apiV1WithDriver<unknown, { time: DeliveryTime }>()
  .use(
    withValidation({
      request: { schema: eventRequestSchema, safeParse: true },
      httpResponse: { schema: eventResponseSchema, safeParse: true },
    }),
  )
  .use(withExceptionAlarm())
  .handler(async (event: DriverApiEvent) => {
    const { time } = event.pathParameters!;
    const country = event.requestContext.authorizer?.claims['custom:country'] ?? Country.BH;
    const routePlanRepository = new RoutePlanRepository();
    const get = new GetDriverMetricsUseCase(routePlanRepository);

    try {
      const response = await get.exec(event.driverId!, time! as DeliveryTime, country);
      return {
        statusCode: 200,
        body: response,
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      await ObsAlarm.fire({
        name: 'getDriverMetricsUseCase',
        description: 'failed to get driver metrics',
        error: err,
        severity: 'ERROR',
        additional: {
          driverId: event.driverId,
          time,
          country,
        },
      });
      throw new InternalServerError();
    }
  });
