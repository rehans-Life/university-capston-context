import { InternalServerError } from 'http-errors';

import { apiV2Middleware, withSecrets } from '@calo/core';

import GenerateRouteUseCase from './useCase';
import { RouteCalculationRequest } from '../../libs/interfaces';
import RouteService from '../../libs/services/RouteService';

export const handler = apiV2Middleware<RouteCalculationRequest>()
  .use(
    withSecrets(
      {
        keys: process.env.SECRET_ARN!
      },
      true
    )
  )
  .handler(async (event) => {
    try {
      const routeService = new RouteService();
      const data = event.body;

      const useCase = new GenerateRouteUseCase(routeService);
      const calculatedRoute = await useCase.exec(data);

      return {
        statusCode: 200,
        body: JSON.stringify(calculatedRoute)
      };
    } catch (error) {
      console.log('generation failed for: ', JSON.stringify(event.body));
      console.error(error);
      throw new InternalServerError('Something went wrong while calculating the route!');
    }
  });
