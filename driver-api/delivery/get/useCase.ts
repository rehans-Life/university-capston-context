import { DeliveryRepository } from '@calo-backend/repositories/DDB';

class GetDeliveryListUseCase {
  constructor(private readonly deliveryRepository: DeliveryRepository) {}

  async exec(id: string) {
    const entity = await this.deliveryRepository.findById(id);
    return entity;
  }
}

export default GetDeliveryListUseCase;
