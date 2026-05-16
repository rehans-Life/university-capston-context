import middleware from 'libs/middleware';
import RecalculateAutoRouteETAUseCase from './useCase';
import { LocationRepository } from 'libs/repositories/API';

export const handler = middleware(async (event) => {
  const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  const useCase = new RecalculateAutoRouteETAUseCase(new LocationRepository(process.env.LOCATION_SERVICE_URL!));

  const result = await useCase.exec(data);
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
});
