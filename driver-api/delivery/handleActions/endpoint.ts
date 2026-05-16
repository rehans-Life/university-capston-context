import { RouteItemAction } from '@calo-backend/interfaces';
import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { ObsAlarm, logger, withExceptionAlarm, withValidation } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';

import { eventRequestSchema, eventResponseSchema } from './schema';
import HandleActionsUseCase from './useCase';
import { toError } from '@libs/errors';
import { DriverApiEvent } from '@libs/interfaces';
import { handleActionsBodySchema } from '@libs/schemas';

export const handler = apiV1WithDriver<{ actions: Omit<RouteItemAction, 'createdAt'>[] }, { id: string }>()
  .use(
    withValidation({
      request: { schema: eventRequestSchema, safeParse: true },
      httpResponse: { schema: eventResponseSchema, safeParse: true },
    }),
  )
  .use(withExceptionAlarm())
  .handler(async (event: DriverApiEvent) => {
    const id = event.pathParameters!.id!;
    const rawBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? {};
    const { actions } = handleActionsBodySchema.parse(rawBody);
    const { phone_number: driverNumber, name } = event.requestContext.authorizer!.claims;

    const deliveryRepository = new DeliveryRepository();
    const routePlanRepository = new RoutePlanRepository();
    const subscriptionRepository = new SubscriptionRepository();

    const useCase = new HandleActionsUseCase(deliveryRepository, routePlanRepository, subscriptionRepository);

    try {
      await useCase.exec(id, driverNumber, name, event.driverId!, actions as Omit<RouteItemAction, 'createdAt'>[]);
      return {
        statusCode: 200,
        body: null,
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      await ObsAlarm.fire({
        name: 'HandleActionsUseCase',
        description: 'failed to handle driver actions',
        error: err,
        severity: 'ERROR',
        additional: {
          id,
          driverNumber,
          name,
          driverId: event.driverId,
          actions,
        },
      });
      throw new InternalServerError();
    }
  });
