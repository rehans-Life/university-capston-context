import middleware from 'libs/middleware';
import { withSecrets } from 'libs/middlewares';
import { MapRepository } from 'libs/repositories/DDB';
import { RoutingConfigRepository } from '../../../libs/repositories';
import { RoutePlanRepository } from 'libs/repositories/ES';
import GetRoutePlansForConfigUseCase from './useCase';

interface PathParameters {
  id: string;
  day: string;
}

export const handler = middleware<null, null, PathParameters>(async (event) => {
  const { id, day } = event.pathParameters;
  console.log('🚀 ~ handler ~ id, day:', id, day);
  const useCase = new GetRoutePlansForConfigUseCase(
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
