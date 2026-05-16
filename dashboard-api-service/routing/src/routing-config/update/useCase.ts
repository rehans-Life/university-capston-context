import { RoutingConfigRepository } from '../../../libs/repositories';
import { NotFound } from 'http-errors';
import { UpdateRoutingConfigRequest } from '../../../libs/interfaces';

class UpdateRoutingConfigUseCase {
  constructor(private readonly routingConfigRepository: RoutingConfigRepository) {}

  async exec(data: UpdateRoutingConfigRequest, id: string) {
    const entity = await this.routingConfigRepository.findById(id);
    if (!entity) {
      throw new NotFound(`Routing Config with id ${id} not found`);
    }
    entity.set(data);
    await this.routingConfigRepository.update(entity);
    return entity;
  }
}

export default UpdateRoutingConfigUseCase;
