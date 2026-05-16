import { DeliveryTime } from '@calo-backend/enums';
import { logger } from '@teamcalo/core';
import { InternalServerError } from 'http-errors';
import { keyBy } from 'lodash-es';

import { makeDeliveryEstimation } from '../../../libs/factories/DDB';
import { DeliveryETAPriority, PreferredRouteItemWithDeliveryTime } from '../../../libs/interfaces';
import { DeliveryEstimationRepository } from '../../../libs/repositories/DDB';
import { toError } from '@libs/errors';

class SyncETAUseCase {
  constructor(private readonly deliveryEstimationRepo: DeliveryEstimationRepository) {}

  async exec(preferredRoute: PreferredRouteItemWithDeliveryTime[], day: string, deliveryTime: DeliveryTime) {
    try {
      const estimations = await this.deliveryEstimationRepo.batchFindById(preferredRoute.map((pr) => pr.userId));
      logger.debug(`estimations: ${JSON.stringify(estimations)}`);
      const keyedEstimation = keyBy(estimations, 'sk');
      const response = await Promise.allSettled(
        preferredRoute.map((item) => {
          const existingEntity = keyedEstimation[item.userId];

          const newEta: DeliveryETAPriority = {
            day,
            deliveryTime,
            priority: item.priority || 0,
            time: item?.deliveryTime,
            groupBufferTime: item.groupBufferTime,
            ETAs: [{ time: item.deliveryTime, createdAt: new Date().toISOString() }],
          };

          if (existingEntity) {
            if (!existingEntity.etas) {
              existingEntity.set({
                etas: [newEta], //fix for old data, where etas is not present
              });
              return this.deliveryEstimationRepo.update(existingEntity);
            }

            const latestETA = existingEntity.etas[0];
            if (latestETA.day === day && latestETA.deliveryTime === deliveryTime) {
              latestETA.ETAs.push({ time: item.deliveryTime, createdAt: new Date().toISOString() });
              latestETA.time = item.deliveryTime;

              if (existingEntity.etas.length > 1) {
                const oldETA = existingEntity.etas[1];
                existingEntity.set({
                  etas: [latestETA, oldETA],
                });
              } else {
                existingEntity.set({
                  etas: [latestETA],
                });
              }
              return this.deliveryEstimationRepo.update(existingEntity);
            }

            const etas = [newEta];
            if (existingEntity.etas && existingEntity.etas.length > 0) {
              etas.push(latestETA);
            }
            existingEntity.set({
              etas: etas,
            });
            return this.deliveryEstimationRepo.update(existingEntity);
          }
          const estimation = makeDeliveryEstimation(item.userId, [newEta]);
          return this.deliveryEstimationRepo.create(estimation);
        }),
      );

      for (const res of response) {
        if (res.status !== 'fulfilled') {
          logger.error(`create estimation failed with error: ${res.reason}`);
        }
      }
    } catch (error) {
      logger.error(toError(error).message);
      throw new InternalServerError('Something went wrong');
    }
  }
}

export default SyncETAUseCase;
