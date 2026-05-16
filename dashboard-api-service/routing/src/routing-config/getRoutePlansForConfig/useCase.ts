import { MapRepository } from 'libs/repositories/DDB';
import { RoutingConfigRepository } from '../../../libs/repositories';
import { RoutePlanRepository } from 'libs/repositories/ES';
import { getRoutePlansForConfig } from '../runRoutingConfig/helper';
import { NotFound } from 'http-errors';

class GetRoutePlansForConfigUseCase {
  constructor(
    private readonly routingConfigRepository: RoutingConfigRepository,
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly mapRepository: MapRepository
  ) {}

  async exec(id: string, day?: string) {
    const config = await this.routingConfigRepository.findById(id);
    if (!config) {
      throw new NotFound(`Routing Config with id ${id} not found`);
    }

    const routePlans = await getRoutePlansForConfig(config, day, this.mapRepository, this.routePlanRepository);

    return routePlans;
  }
}

export default GetRoutePlansForConfigUseCase;
