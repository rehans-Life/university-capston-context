import { DeliveryEntity } from '@calo-backend/entities/DDB';
import fireEvent from '@calo-backend/fireEvent';
import { Delivery } from '@calo-backend/interfaces';
import { DeliveryRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import sendMessage from '@calo-backend/sendMessage';
import { ObsAlarm, logger } from '@teamcalo/core';
import { NotFound } from 'http-errors';
import sendSlackMessage from 'src/sendSlackMessage/sendSlackMessage';

import { Country, DDeliveryStatus } from '@calo/types';

import { UpdateDeliveryReq } from '../../libs/interfaces';
import { getNumberOfCoolerBagsToBeReturned } from '../helper';
import { toError } from '@libs/errors';

const COOLER_BAG_REMINDER_DAYS_INTERVAL = 14;
const THRESHOLD = 3;

class UpdateDeliveryUseCase {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly esDeliveryRepository: EsDeliveryRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async exec(
    id: string,
    {
      deliveryStatus,
      reasonForNotFollowPriority,
      coolerBagNotReturned,
      coolerBagsReturned,
      deliveredAtLocation,
      pod,
    }: UpdateDeliveryReq,
    sub: string,
    name: string,
  ) {
    logger.debug('🚀 ~ UpdateDeliveryUseCase ~ name:', name);
    logger.debug('🚀 ~ UpdateDeliveryUseCase ~ sub:', sub);
    logger.debug('🚀 ~ UpdateDeliveryUseCase ~ id:', id);
    let delivery = await this.deliveryRepository.findById(id);
    logger.debug('🚀 ~ UpdateDeliveryUseCase ~ delivery data:', {
      id: delivery.id,
      userId: delivery.userId,
      coolerBagsReturned: delivery.coolerBagsReturned,
      deliveryStatus: delivery.deliveryStatus,
      day: delivery.day,
      time: delivery.time,
    });

    if (!delivery) {
      throw new NotFound();
    }

    let dataToUpdate: Partial<Delivery> = {};
    if (deliveryStatus) {
      dataToUpdate = {
        ...dataToUpdate,
        deliveryStatus: deliveryStatus,
        coolerBagsReturned: coolerBagsReturned ?? 0,
        ...(deliveryStatus === DDeliveryStatus.delivered && {
          driver: {
            id: sub,
            name,
          },
          ...(pod && {
            pod: {
              images: pod.images ?? null,
              note: pod.note ?? null,
            },
          }),
        }),
      };
      if (deliveryStatus === DDeliveryStatus.delivered) {
        dataToUpdate = {
          ...dataToUpdate,
          deliveredAt: new Date().toISOString(),
        };
        logger.debug('🚀 ~ UpdateDeliveryUseCase ~ dataToUpdate [before try/catch]:', dataToUpdate);

        if (coolerBagNotReturned && (delivery.country === Country.AE || delivery.country === Country.GB)) {
          await this.coolerBagReminder(delivery);
        }

        await sendMessage(
          {
            day: delivery.day,
            deliveryId: delivery.sk,
            driverId: sub,
            time: delivery.time!,
            userId: delivery.userId,
            reasonForNotFollowPriority,
            deliveredAtLocation,
          },
          {
            QueueUrl: process.env.HANDLE_DELIVERD_STATUS_QUEUE_URL!,
          },
        );
      }
    }

    delivery.set({
      ...dataToUpdate,
    });
    logger.debug('🚀 ~ UpdateDeliveryUseCase ~ delivery.getDirty() [after set]:', delivery.getDirty());
    if (Object.keys(delivery.getDirty()).length > 0) {
      logger.debug('🚀 ~ updating delivery with ID ~ updating delivery', delivery.sk);
      await this.deliveryRepository.update(delivery);
    }
    return delivery;
  }

  private async coolerBagReminder(delivery: DeliveryEntity) {
    try {
      const subscription = await this.subscriptionRepository.findById(delivery.userId);
      const bagsByUser = await getNumberOfCoolerBagsToBeReturned(
        this.esDeliveryRepository,
        delivery.day,
        [delivery.userId],
        COOLER_BAG_REMINDER_DAYS_INTERVAL,
      );
      const bagsStillNeeded = bagsByUser[delivery.userId]?.bagsStillNeeded ?? 0;
      logger.debug(
        `🚀 ~ UpdateDeliveryUseCase ~ total bagsStillNeeded for user ${delivery.userId}: ${bagsStillNeeded}`,
      );

      if (bagsStillNeeded) {
        if (subscription.endsAt && subscription.endsAt <= delivery.day) {
          // expired subscription holding bags
          await sendSlackMessage({
            channel: 'ops-bag-alerts',
            type: 'ExpiredSubscriptionsHoldingCoolerBags',
            subscription,
            delivery,
            bagsStillNeeded,
          });
        }
        if (bagsStillNeeded > THRESHOLD) {
          await sendSlackMessage({
            channel: 'ops-bag-alerts',
            type: 'CustomerHoldingMoreThanXDeliveries',
            subscription,
            delivery,
            bagsStillNeeded,
            threshold: THRESHOLD,
          });

          if (bagsStillNeeded > 1 && delivery.country === Country.AE) {
            await this.sendCoolerBagNotifications(delivery);
          }
        }
      }
    } catch (error) {
      const err = toError(error);
      logger.error('failed to get cooler bag data', err.message);
      await ObsAlarm.fire({
        name: 'UpdateDeliveryUseCase',
        description: 'failed to get cooler bag data',
        error: err,
        severity: 'ERROR',
      });
    }
  }

  private async sendCoolerBagNotifications(delivery: DeliveryEntity) {
    try {
      logger.debug('🚀 ~ UpdateDeliveryUseCase ~ firing intercom event');
      await fireEvent(process.env.SEND_INTERCOM_ARN!, {
        userId: delivery.userId,
        message: `Hello there ${delivery.name}👋

        We just wanted to remind you to return your Calo cooler bag at your earliest convenience as our bags are reusable and help us keep our deliveries eco-friendly🙏

    But don't you worry, we've got you covered!💪 We'll send you a new cooler bag with your next delivery and you can conveniently return the cooler bag from your previous delivery then💚`,
      });
    } catch (error) {
      const err = toError(error);
      logger.error('firing event send intercom failed', err.message);
      await ObsAlarm.fire({
        name: 'UpdateDeliveryUseCase',
        description: 'failed to fire intercom event',
        error: err,
        severity: 'ERROR',
      });
    }

    try {
      logger.debug('🚀 ~ UpdateDeliveryUseCase ~ firing push notification event');
      await fireEvent(process.env.SEND_PUSH_NOTIFICATION_ARN!, {
        userId: delivery.userId,
        message: `Hey ${delivery.name}, please don't forget to return your cooler bag!`,
      });
    } catch (error) {
      const err = toError(error);
      logger.error('firing event send push notification failed', err.message);
      await ObsAlarm.fire({
        name: 'UpdateDeliveryUseCase',
        description: 'failed to fire push notification event',
        error: err,
        severity: 'ERROR',
      });
    }
  }
}

export default UpdateDeliveryUseCase;
