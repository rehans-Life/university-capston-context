import { withSecrets } from '@calo-backend/middleware';
import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { DeliveryRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { ObsAlarm, logger, withExceptionAlarm, withValidation } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';

import { eventRequestSchema, eventResponseSchema } from './schema';
import UpdateDeliveryUseCase from './useCase';
import { DriverApiEvent, UpdateDeliveryReq } from '../../libs/interfaces';
import { toError } from '@libs/errors';
import { updateDeliveryBodySchema } from '@libs/schemas';

export const handler = apiV1WithDriver<UpdateDeliveryReq, { id: string }>()
  .use(
    withValidation({
      request: { schema: eventRequestSchema, safeParse: true },
      httpResponse: { schema: eventResponseSchema, safeParse: true },
    }),
  )
  .use(withExceptionAlarm())
  .handler(async (event: DriverApiEvent) => {
    const { id } = event.pathParameters ?? {};
    const rawBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? {};
    const updateData = updateDeliveryBodySchema.parse(rawBody);
    logger.debug('🚀 ~ .handler ~ event.body:', updateData);
    const { name } = event.requestContext.authorizer!.claims;

    try {
      const useCase = new UpdateDeliveryUseCase(
        new DeliveryRepository(),
        new EsDeliveryRepository(),
        new SubscriptionRepository(),
      );
      const delivery = await useCase.exec(id!, updateData, event.driverId!, name);
      return {
        statusCode: 200,
        body: {
          id,
          deliveryStatus: delivery.deliveryStatus,
          deliveredAt: delivery.deliveredAt,
          coolerBagsReturned: delivery.coolerBagsReturned,
        },
      };
    } catch (error) {
      const err = toError(error);
      logger.error(err.message);
      await ObsAlarm.fire({
        name: 'UpdateDeliveryUseCase',
        description: 'failed to update delivery',
        error: err,
        severity: 'ERROR',
        additional: {
          id,
          name,
          driverId: event.driverId,
          updateData,
        },
      });
      throw new InternalServerError();
    }
  })
  .use(withSecrets(process.env.OS_SECRET_ARN));
