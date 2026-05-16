import { DeliveryEntity } from '@calo-backend/entities/DDB';
import { DeliveryTime } from '@calo-backend/enums';
import { DeliveryRepository } from '@calo-backend/repositories/DDB';

import { DDeliveryStatus, Kitchen } from '@calo/types';

export const getDeliveries = async (
  driverId: string,
  day: string,
  kitchen: Kitchen,
  time: DeliveryTime,
  deliveryRepository: DeliveryRepository,
) => {
  const deliveries = await deliveryRepository.getDriverDeliveries(driverId, day, kitchen, time);
  const filteredDeliveries = deliveries.map((delivery) => {
    if (
      delivery.deliveryStatus === DDeliveryStatus.outForDelivery ||
      delivery.deliveryStatus === DDeliveryStatus.unableToDeliver
    ) {
      const { deliveryStatus: _deliveryStatus, ...rest } = delivery; // Remove deliveryStatus
      return rest; // Return the delivery without deliveryStatus
    }
    return delivery;
  }) as DeliveryEntity[];

  return filteredDeliveries;
};
