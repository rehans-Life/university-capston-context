import middleware from 'libs/middleware';
import ApproveDynamicRouteUseCase from './useCase';
import { logger } from '@teamcalo/core';

export const handler = middleware(async (event) => {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  const { filename, approver, routes } = body;

  logger.info('approveDynamicRoute handler called', { filename, approver });

  const useCase = new ApproveDynamicRouteUseCase();
  const response = await useCase.exec(filename, approver, routes);

  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
});
