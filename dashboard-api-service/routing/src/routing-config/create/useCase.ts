import { RoutingConfigRepository } from '../../../libs/repositories';
import { CreateRoutingConfigRequest } from '../../../libs/interfaces';
import { makeRoutingConfig } from '../../../libs/factories';

class CreateRoutingConfigUseCase {
  constructor(private readonly routingConfigRepository: RoutingConfigRepository) {}

  async exec(data: CreateRoutingConfigRequest) {
    const routingConfigData = makeRoutingConfig(
      data.name,
      data.time,
      data.kitchen,
      data.country,
      data.enabled,
      data.shiftStartTime,
      data.shiftEndTime,
      data.deliveryStartTime,
      data.endAtKitchen,
      data.deliveryEndTime,
      data.avgDeliveryTime,
      data.travelDurationMultiple,
      data.windowType,
      data.windowSize,
      data.lookbackDays,
      data.customDispatchLocation,
      data.autoAssignRoutePlans,
      data.simulationStartTime,
      data.zoneIds,
      data.numberOfDrivers,
      data.costModel,
      data.isDeliveryEndTimeNextDay,
      data.isShiftEndTimeNextDay,
      data.isSubslotTimeNextDay,
      data.firstSubslotEndTime
    );
    const routingConfig = await this.routingConfigRepository.create(routingConfigData);
    return routingConfig;
  }
}

export default CreateRoutingConfigUseCase;
