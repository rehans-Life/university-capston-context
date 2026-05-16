import middleware from 'libs/middleware';
import AnalyzeCompletedSimulatedRouteUseCase from './useCase';
import { RoutePlanRepository } from '../../../libs/repositories';
import { DeliveryRepository } from 'libs/repositories/ES';
import { withSecrets } from 'libs/middlewares';

interface PathParameters {
  id: string;
}

export const handler = middleware<null, null, PathParameters>(async (event) => {
  console.log('🚀 ~ handler ~ event:', JSON.stringify(event, null, 2));
  const { id } = event.pathParameters;

  const analyzeCompletedSimulatedRouteUseCase = new AnalyzeCompletedSimulatedRouteUseCase(
    new RoutePlanRepository(),
    new DeliveryRepository()
  );
  const response = await analyzeCompletedSimulatedRouteUseCase.exec(id);
  console.log('🚀 ~ handler ~ response:', JSON.stringify(response, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}).use(withSecrets(process.env.OS_SECRET_ARN));
