import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { DeliveryRepository } from '@calo-backend/repositories/DDB';
import { ObsAlarm, logger, withExceptionAlarm, withValidation } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';

import { eventRequestSchema, eventResponseSchema } from './schema';
import GetDeliveryListUseCase from './useCase';
import { toError } from '@libs/errors';
import { DriverApiEvent, GetDeliveriesReq } from '@libs/interfaces';

export const handler = apiV1WithDriver<unknown, unknown, GetDeliveriesReq>()
  .use(
    withValidation({
      request: { schema: eventRequestSchema, safeParse: true },
      httpResponse: { schema: eventResponseSchema, safeParse: true },
    }),
  )
  .use(withExceptionAlarm())
  .handler(async (event: DriverApiEvent) => {
    const { id } = event.pathParameters ?? {};
    const getList = new GetDeliveryListUseCase(new DeliveryRepository());
    try {
      const response = await getList.exec(id!);
      return {
        statusCode: 200,
        body: response,
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      await ObsAlarm.fire({
        name: 'GetDeliveryUseCase',
        description: 'failed to get delivery',
        error: err,
        severity: 'ERROR',
        additional: {
          id,
        },
      });
      throw new InternalServerError();
    }
  });
