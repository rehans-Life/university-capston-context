import { RoutingConfigRepository } from '../../../libs/repositories';
import { UpdateRoutingConfigRequest } from '../../../libs/interfaces';

import UpdateRoutingConfigUseCase from './useCase';
import middleware from 'libs/middleware';

interface PathParameters {
  id: string;
}

export const handler = middleware<UpdateRoutingConfigRequest, null, PathParameters>(async (event) => {
  const { id } = event.pathParameters;
  const useCase = new UpdateRoutingConfigUseCase(new RoutingConfigRepository());
  const req = event.body;
  const routingConfig = await useCase.exec(req, id);
  const body = routingConfig.valueOf();
  return {
    statusCode: 200,
    body: JSON.stringify(body)
  };
});
