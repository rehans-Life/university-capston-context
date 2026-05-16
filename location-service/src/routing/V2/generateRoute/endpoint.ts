import { InternalServerError } from 'http-errors';

import { logger, withSecrets, sqsMiddleware } from '@calo/core';
import { FileService, RouteService } from '../../../libs/services';
import { GenerateTimeWindowRouteParams } from '../../../libs/interfaces';
import GenerateRouteUseCase from './useCase';

const lambdaHandler = async (event: any) => {
  const recordPromises = event.Records.map(async (record: any) => {
    try {
      const timeWindowRouteParams = record.body as GenerateTimeWindowRouteParams;
      logger.info(`Starting route generation for file: ${timeWindowRouteParams.fileName}`);
      const routeService = new RouteService();
      const fileService = new FileService();
      const useCase = new GenerateRouteUseCase(routeService, fileService);
      await useCase.exec({
        timeWindowRouteParams
      });
      logger.info(`Route generation successful for file: ${timeWindowRouteParams.fileName}`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          fileName: timeWindowRouteParams.fileName
        })
      };
    } catch (error) {
      logger.error('Generation failed for: ', JSON.stringify(record.body));
      logger.error(error);
      throw new InternalServerError('Something went wrong while calculating the route!');
    }
  });
  return Promise.allSettled(recordPromises);
};

export const handler = sqsMiddleware()
  .use(
    withSecrets(
      {
        keys: process.env.SECRET_ARN!
      },
      true
    )
  )
  .handler(lambdaHandler);
