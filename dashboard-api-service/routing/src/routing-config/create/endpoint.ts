import { RoutingConfigRepository } from '../../../libs/repositories';
import { CreateRoutingConfigRequest } from '../../../libs/interfaces';
import middleware from 'libs/middleware';

import CreateRoutingConfigUseCase from './useCase';

export const handler = middleware<CreateRoutingConfigRequest>(async (event) => {
  const useCase = new CreateRoutingConfigUseCase(new RoutingConfigRepository());
  const req = event.body as unknown as CreateRoutingConfigRequest;
  const routingConfig = await useCase.exec(req);
  const body = routingConfig.valueOf();
  return {
    statusCode: 200,
    body: JSON.stringify(body)
  };
});
