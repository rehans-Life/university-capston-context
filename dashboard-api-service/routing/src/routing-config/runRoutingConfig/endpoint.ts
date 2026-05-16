import { MapRepository } from 'libs/repositories/DDB';
import { RoutingConfigRepository } from '../../../libs/repositories';
import { RoutePlanRepository } from 'libs/repositories/ES';
import middleware from 'libs/middleware';
import RunRoutingConfigUseCase from './useCase';
import { withSecrets } from 'libs/middlewares';
import { logger } from '@teamcalo/core';

interface PathParameters {
  id: string;
}

interface Body {
  day: string;
}

export const handler = middleware<Body, null, PathParameters>(async (event) => {
  const { id } = event.pathParameters;
  const body = event.body && (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);
  const day = body?.day;
  logger.debug('🚀 ~ handler ~ id, day:', id, day);
  const useCase = new RunRoutingConfigUseCase(
    new RoutingConfigRepository(),
    new RoutePlanRepository(),
    new MapRepository()
  );
  const response = await useCase.exec(id, day);
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}).use(withSecrets(process.env.OS_SECRET_ARN));
