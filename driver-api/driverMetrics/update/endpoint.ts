import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { DeliveryRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { logger, withValidation } from '@teamcalo/core';
import { InternalServerError, NotFound, NotAcceptable } from 'http-errors';
import { LocationRepository } from 'src/libs/repositories/API';

import UpdateDriverMetricsWithAutoRouteGenerationUseCase from './autoRouteGenerationUseCase';
import { eventRequestSchema, eventResponseSchema } from './schema';
import UpdateDriverMetricsUseCase from './updateUseCase';
import { UpdateDriverMetricsReq } from '@libs/driver-types';
import { toError } from '@libs/errors';
import { DriverApiEvent } from '@libs/interfaces';
import { updateDriverMetricsBodySchema } from '@libs/schemas';

export const handler = apiV1WithDriver<UpdateDriverMetricsReq, { id: string }>()
  .use(withValidation({ request: { schema: eventRequestSchema }, httpResponse: { schema: eventResponseSchema } }))
  .handler(async (event: DriverApiEvent) => {
    const { id } = event.pathParameters!;
    const rawBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? {};
    const data = updateDriverMetricsBodySchema.parse(rawBody);

    const routePlanRepository = new RoutePlanRepository();
    const locationRepository = new LocationRepository(process.env.LOCATION_SERVICE_URL!);
    const deliveryRepository = new DeliveryRepository();
    const updateUseCase = data.driverActions?.some(
      (action) => action.type === 'STARTED_DELIVERING' && action.autoGenerateRoute === true,
    )
      ? new UpdateDriverMetricsWithAutoRouteGenerationUseCase(routePlanRepository, locationRepository)
      : new UpdateDriverMetricsUseCase(routePlanRepository, locationRepository, deliveryRepository);
    try {
      const response = await updateUseCase.exec(id!, data);
      return {
        statusCode: 200,
        body: response,
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      if (error === 'not found') {
        throw new NotFound();
      }
      if (error === 'not allowed') {
        throw new NotAcceptable('It is not allowed to start shift yet');
      }
      throw new InternalServerError('Something went wrong');
    }
  });
