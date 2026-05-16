import { withSecrets } from 'libs/middlewares';
import middleware from 'libs/middleware';
import GetRoutingConfigsUseCase from './useCase';
import { RoutingConfigFilters } from '../../../libs/interfaces';
import { RoutingConfigRepository } from '../../../libs/repositories';

export const handler = middleware<null, null, RoutingConfigFilters>(async (event) => {
  const { country, kitchen, time } = event.pathParameters;
  const routingConfigRepository = new RoutingConfigRepository();
  const getList = new GetRoutingConfigsUseCase(routingConfigRepository);
  const body = await getList.exec({ country, kitchen, time });

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: body
    })
  };
}).use(withSecrets(process.env.OS_SECRET_ARN));
