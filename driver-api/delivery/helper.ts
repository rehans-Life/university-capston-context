import { DeliveryRepository } from '@calo-backend/repositories/ES';
import { logger } from '@teamcalo/core';
import { parseISO, subDays } from 'date-fns';
import { format } from 'date-fns/fp';
import { Dictionary, keyBy } from 'lodash';

import { DeliveryFilters } from '@calo/dashboard-types';
import { DDeliveryStatus } from '@calo/types';

export async function getNumberOfCoolerBagsToBeReturned(
  deliveryRepository: DeliveryRepository,
  day: string,
  userIds: string[],
  daysInterval: number,
): Promise<Dictionary<{ userId: string; bagsStillNeeded: number }>> {
  const startDate = subDays(parseISO(day), daysInterval);
  const endDate = subDays(parseISO(day), 1); // Exclude current day - we're giving a bag now, don't count it
  const filters: Partial<DeliveryFilters> = {
    userIds: userIds,
    day: {
      gte: format('yyyy-MM-dd')(startDate),
      lte: format('yyyy-MM-dd')(endDate),
    },
    deliveryStatus: DDeliveryStatus.delivered,
  };
  logger.debug('🚀 ~ getNumberOfCoolerBagsToBeReturned ~ fetching cooler bag data with filters:', filters);

  const results = await deliveryRepository.getNumberOfCoolerBagsToBeReturned(filters);
  const bagsByUser = keyBy(results, 'userId');
  logger.debug('🚀 ~ getNumberOfCoolerBagsToBeReturned ~ bagsByUser:', bagsByUser);
  return bagsByUser;
}
