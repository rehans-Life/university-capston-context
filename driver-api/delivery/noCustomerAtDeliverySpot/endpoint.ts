import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { DeliveryRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { ObsAlarm, logger, withExceptionAlarm, withValidation } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';

import { eventRequestSchema, eventResponseSchema } from './schema';
import NoCustomerSMSUseCase from './useCase';
import { toError } from '@libs/errors';
import { DriverApiEvent } from '@libs/interfaces';

export const handler = apiV1WithDriver<unknown, { id: string }>()
  .use(withValidation({ request: { schema: eventRequestSchema }, httpResponse: { schema: eventResponseSchema } }))
  .use(withExceptionAlarm())
  .handler(async (event: DriverApiEvent) => {
    const { id } = event.pathParameters ?? {};
    const { phone_number: driverNumber, name } = event.requestContext.authorizer!.claims;

    const deliveryRepository = new DeliveryRepository();
    const routePlanRepository = new RoutePlanRepository();

    const sendSms = new NoCustomerSMSUseCase(deliveryRepository, routePlanRepository);

    try {
      await sendSms.exec(id!, driverNumber, name, event.driverId!);
      return {
        statusCode: 200,
        body: null,
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      await ObsAlarm.fire({
        name: 'NoCustomerAtDeliverySpotUseCase',
        description: 'failed to send sms to customer ',
        error: err,
        severity: 'ERROR',
        additional: {
          id,
          driverNumber,
          name,
          driverId: event.driverId,
        },
      });
      throw new InternalServerError();
    }
  });
