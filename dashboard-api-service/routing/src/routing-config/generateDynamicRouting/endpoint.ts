import middleware from 'libs/middleware';
import GenerateDynamicRoutingUseCase from './useCase';
import { DeliveryRepository } from 'libs/repositories/ES';
import { withSecrets } from 'libs/middlewares';
import { logger } from '@teamcalo/core';

/**
 * Generates dynamic routing for a given day and routing configuration.
 *
 * Input:
 * - day: Delivery day (YYYY-MM-DD)
 * - routingConfigID: Routing configuration ID to use
 *
 * Output:
 * - fileName: S3 path where the multi-driver routes are stored
 */

export const handler = middleware(async (event) => {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  const { day, routingConfigID } = body;

  const useCase = new GenerateDynamicRoutingUseCase(new DeliveryRepository());
  const response = await useCase.exec({ routingConfigID, day });

  logger.info('configRequest completed', { fileName: response.fileName });

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}).use(withSecrets(process.env.OS_SECRET_ARN));
