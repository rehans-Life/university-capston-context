import { SubscriptionEntity } from '@calo-backend/entities/DDB';
import DeliveryEntity from '@calo-backend/entities/ES/DeliveryEntity';
import { DeliveryTime } from '@calo-backend/enums';
import { RouteItemActionType } from '@calo-backend/enums';
import { RoutePlanRepository, SubscriptionRepository, DeliveryRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as ESDeliveryRepository } from '@calo-backend/repositories/ES';
import { subDays, format, subWeeks } from 'date-fns/fp';

import { DeliveryFilters } from '@calo/dashboard-types';
import { Country, DDeliveryStatus, DeliveryStatus, Kitchen } from '@calo/types';

import DriverDeliveryActionedEvent from '../../../delivery/handleActions/events/DeliveryActionsEvent';
import { HandleDeliveredStatusReq } from '../../../libs/interfaces';
class HandleDeliveredStatusUseCase {
  constructor(
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly deliveryRepository: DeliveryRepository,
    private readonly eSDeliveryRepository: ESDeliveryRepository,
  ) {}

  async exec({
    day,
    deliveryId,
    driverId,
    time,
    userId,
    reasonForNotFollowPriority,
    deliveredAtLocation,
  }: HandleDeliveredStatusReq) {
    //routePlan day is the same as deliveryDay for deliveries so in order to fetch correct routePlan refactor of day is required
    const deliveryDay = time === DeliveryTime.evening ? format('yyyy-MM-dd')(subDays(1)(new Date(day))) : day;
    const plan = await this.routePlanRepository.getByDayIdTime(deliveryDay, driverId, time || DeliveryTime.morning);
    if (plan) {
      plan.set({
        deliveredDeliveries: plan.deliveredDeliveries + 1,
        lastDeliveredId: deliveryId,
        deliveredPositions: [...(plan.deliveredPositions || []), deliveryId],
        routePlan: {
          ...plan.routePlan,
          [`${deliveryId}`]: {
            ...plan.routePlan[deliveryId],
            reasonForNotFollowPriority,
            deliveredAtLocation,
          },
        },
      });
      await this.routePlanRepository.update(plan);
    }
    const subscription = await this.subscriptionRepository.findById(userId);

    await this.updateSubscriptionLastDeliveredDate(subscription, day);

    if (plan && plan.country === Country.AE) {
      const coolerBagNotReturned = await this.coolerBagNotReturnedInLastThreeDeliveries(userId, deliveryId);
      if (coolerBagNotReturned && plan) {
        const delivery = await this.deliveryRepository.findById(deliveryId);
        const deliveryActionsEvent = new DriverDeliveryActionedEvent(
          {
            customer: {
              id: userId,
              name: subscription.name,
              email: subscription.email,
              phoneNumber: subscription.phoneNumber,
              lat: delivery.deliveryAddress.lat,
              lng: delivery.deliveryAddress.lng,
            },
            driver: { name: plan?.driver.driverName },
            delivery: { time: delivery.time ?? DeliveryTime.morning, kitchen: delivery.kitchen ?? Kitchen.BH1 },
            action: {
              type: RouteItemActionType.CUSTOMERS_NOT_RETURNING_COOLER_BAGS,
              createdAt: new Date().toISOString(),
            },
          },
          { serviceFunction: 'handleActions' },
        );

        await deliveryActionsEvent.publish();
      }
    }
  }

  private async updateSubscriptionLastDeliveredDate(subscription: SubscriptionEntity, day: string): Promise<void> {
    if (day !== subscription.lastDeliveredDate) {
      subscription.set({
        lastDeliveredDate: day,
      });
      await this.subscriptionRepository.update(subscription);
    }
  }

  private async coolerBagNotReturnedInLastThreeDeliveries(
    subscriptionId: string,
    lastDeliveryId: string,
  ): Promise<boolean> {
    const deliveries = await this.getLastFourDeliveries(subscriptionId, lastDeliveryId, 22);

    if (deliveries.length < 4 || !deliveries[3].withCoolerBag) {
      return false;
    }

    return deliveries
      .slice(0, 3)
      .every((delivery) => delivery.coolerBagsReturned !== undefined && delivery.coolerBagsReturned === 0);
  }

  private async getLastFourDeliveries(
    subscriptionId: string,
    lastDeliveryId: string,
    numberOfWeeks: number,
  ): Promise<DeliveryEntity[]> {
    const lastDelivery = await this.deliveryRepository.findById(lastDeliveryId);
    const startDate = format('yyyy-MM-dd')(subWeeks(numberOfWeeks)(new Date(lastDelivery.day)));

    const filters: DeliveryFilters = {
      userIds: [subscriptionId],
      day: {
        gte: startDate,
        lte: lastDelivery.day,
      },
      deliveryStatus: DDeliveryStatus.delivered,
      status: [DeliveryStatus.upcoming, DeliveryStatus.paymentRequired],
    };

    const deliveries = await this.eSDeliveryRepository.getLastFourDeliveries(filters);

    return deliveries.data;
  }
}

export default HandleDeliveredStatusUseCase;
