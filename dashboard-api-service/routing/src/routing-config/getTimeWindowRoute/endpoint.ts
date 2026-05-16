import { NotFound } from 'http-errors';

import middleware from 'libs/middleware';

import GetTimeWindowRouteUseCase from './useCase';
import { logger } from '@teamcalo/core';
import { DriverRepository } from '../../../libs/repositories';

interface QueryStringParameters {
  fileName: string;
}

export const handler = middleware<null, QueryStringParameters>(async (event) => {
  const { fileName } = event.queryStringParameters;
  logger.info('Fetching time window route for fileName:', { fileName });
  const get = new GetTimeWindowRouteUseCase(new DriverRepository());

  const route = await get.exec(fileName);

  if (!route) {
    throw new NotFound('Route not found!');
  }

  return {
    statusCode: 200,
    body: JSON.stringify(route)
  };
});
