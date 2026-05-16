import { RoutingConfigFilters } from '../../../libs/interfaces';
import { RoutingConfigRepository } from '../../../libs/repositories';

class GetRoutingConfigsUseCase {
  constructor(private readonly routingConfigRepository: RoutingConfigRepository) {}

  async exec(filters: RoutingConfigFilters) {
    const configs = await this.routingConfigRepository.getWithFilters(filters);
    const body = configs.map((m) => m.valueOf());

    return body;
  }
}

export default GetRoutingConfigsUseCase;
