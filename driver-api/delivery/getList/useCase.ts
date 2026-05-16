import { DeliveryEntity } from '@calo-backend/entities/DDB';
import { DeliveryTime } from '@calo-backend/enums';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { addDays, format, getHours } from 'date-fns/fp';
import { utcToZonedTime } from 'date-fns-tz';
import { uniq } from 'lodash';
import { keyBy } from 'lodash-es';

import { TimezoneService } from '@calo/services';
import { Country, Currency, Dictionary, Kitchen } from '@calo/types';

import { DeliveryAdditionalData, GetDeliveriesReq } from '../../libs/interfaces';
import { DeliveryEstimationRepository } from '../../libs/repositories/DDB';
import { formatETA } from '../../libs/utils';
import { getNumberOfCoolerBagsToBeReturned } from '../helper';
import { getDeliveries } from './helpers';

const COOLER_BAG_REMINDER_DAYS_INTERVAL = 14;

class GetDeliveryListUseCase {
  constructor(
    private readonly esDelveryRepository: EsDeliveryRepository,
    private readonly deliveryRepository: DeliveryRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly deliveryEstimationRepo: DeliveryEstimationRepository,
    private readonly routePlanRepository: RoutePlanRepository,
  ) {}

  async exec(id: string, data: GetDeliveriesReq, country: Country, kitchen: Kitchen) {
    const timezone = TimezoneService.getTimeZoneForCountry(country);
    const userTime = utcToZonedTime(Date.now(), timezone);
    data.day = format('yyyy-MM-dd')(userTime);

    const earlyMorningDeliveries = await getDeliveries(
      id,
      this.getDeliveryDay(userTime, DeliveryTime.earlyMorning, country),
      kitchen,
      DeliveryTime.earlyMorning,
      this.deliveryRepository,
    );
    const morningDeliveries = await getDeliveries(
      id,
      this.getDeliveryDay(userTime, DeliveryTime.morning, country),
      kitchen,
      DeliveryTime.morning,
      this.deliveryRepository,
    );
    const eveningDeliveries = await getDeliveries(
      id,
      this.getDeliveryDay(userTime, DeliveryTime.evening, country),
      kitchen,
      DeliveryTime.evening,
      this.deliveryRepository,
    );

    const deliveries: (DeliveryEntity & { shouldReturnBag?: boolean })[] = [
      ...earlyMorningDeliveries,
      ...morningDeliveries,
      ...eveningDeliveries,
    ];

    const bagsByUser = await getNumberOfCoolerBagsToBeReturned(
      this.esDelveryRepository,
      data.day,
      uniq(deliveries.map((d) => d.userId)),
      COOLER_BAG_REMINDER_DAYS_INTERVAL,
    );

    const subscriptions = await this.subscriptionRepository.batchFindById(uniq(deliveries.map((d) => d.userId)));

    const keyed = keyBy(subscriptions, 'sk');

    const deliveryPromises = subscriptions.map(
      (subscription) =>
        subscription.lastDeliveredDate &&
        this.deliveryRepository.findDeliveryByDate(subscription.sk, subscription.lastDeliveredDate),
    );

    const responses = await Promise.allSettled(deliveryPromises);

    for (const delivery of responses) {
      if (delivery.status === 'fulfilled' && delivery.value && delivery.value.withCoolerBag) {
        const userId = delivery.value.userId;
        const currentDelivery = deliveries.find((del) => del.userId === userId);
        if (currentDelivery) {
          currentDelivery.shouldReturnBag = true;
        }
      }
    }

    //get priorities
    const earlyMorningRoutePlan = await this.routePlanRepository.getByDayIdTime(
      data.day,
      id,
      DeliveryTime.earlyMorning,
    );
    const morningRoutePlan = await this.routePlanRepository.getByDayIdTime(data.day, id, DeliveryTime.morning);
    const eveningRoutePlan = await this.routePlanRepository.getByDayIdTime(data.day, id, DeliveryTime.evening);

    const combinedRoutePlan = {
      ...morningRoutePlan?.routePlan,
      ...eveningRoutePlan?.routePlan,
      ...earlyMorningRoutePlan?.routePlan,
    };

    const estimations = await this.getDeliveryEstimations(deliveries.map((d) => d.userId));
    const keyedEstimations = keyBy(estimations, 'sk');
    // eslint-disable-next-line unicorn/prefer-object-from-entries
    let additionalData: Dictionary<DeliveryAdditionalData> = deliveries.reduce((res, d) => {
      const routeItem = combinedRoutePlan[d.sk];

      //@ts-ignore only temp so no need for migration and also not to mess up current drivers planning with buffer time (should be removed in few weeks);
      if (
        keyedEstimations[d.userId] &&
        keyedEstimations[d.userId].eta &&
        (!keyedEstimations[d.userId].etas || keyedEstimations[d.userId].etas?.length === 0)
      ) {
        keyedEstimations[d.userId].set({
          //@ts-ignore only temp so no need for migration and also not to mess up current drivers planning with buffer time (should be removed in few weeks);
          etas: [keyedEstimations[d.userId].eta],
        });
      }

      if (routeItem?.priority !== keyedEstimations[d.userId]?.etas?.[0]?.priority) {
        console.log(
          `Priority mismatch for driver: ${d?.driver?.name} with deliveryId: ${routeItem?.id} and userId: ${d?.userId}`,
          routeItem?.priority,
          keyedEstimations[d.userId]?.etas?.[0]?.priority,
        );
      }

      res[d.sk] = {
        pendingAmount: keyed[d.userId]?.pendingAmount[keyed[d.userId].currency] || 0,
        currency: keyed[d.userId]?.currency || Currency.BHD,
        driverNote: keyed[d.userId]?.deliveryAddresses.find((a) => a.id === d.deliveryAddress.id)?.driverNote,
        driverImages: keyed[d.userId]?.deliveryAddresses.find((a) => a.id === d.deliveryAddress.id)?.driverImages,
        priority: data.withNewPriorities
          ? routeItem?.priority ?? keyedEstimations[d.userId]?.etas?.[0]?.priority
          : d.priority,
        groupBufferTime:
          keyedEstimations[d.userId] && keyedEstimations[d.userId].etas?.[0]
            ? keyedEstimations[d.userId].etas?.[0]?.groupBufferTime ?? 0
            : 0,
        eta: formatETA(keyedEstimations[d.userId], data.day),
        unreturnedCoolerBags: bagsByUser[d.userId]?.bagsStillNeeded ?? 0,
      } as DeliveryAdditionalData;
      return res;
    }, {});

    return {
      deliveries,
      additionalData,
    };
  }

  async getDeliveryEstimations(subIds: string[]) {
    return await this.deliveryEstimationRepo.batchFindById(subIds);
  }

  getDeliveryDay(date: Date, time: DeliveryTime, country: Country) {
    if (time === DeliveryTime.evening) {
      const localHour = date.getHours();
      const eveningCutoffHour = country === Country.GB ? 6 : 2;
      if (localHour >= 0 && localHour < eveningCutoffHour) {
        return format('yyyy-MM-dd')(date);
      }
      return format('yyyy-MM-dd')(addDays(1)(date));
    }

    if (country === Country.GB && time === DeliveryTime.earlyMorning) {
      const timeInHours = getHours(date);
      // early morning shift for GB overlaps with the next day, the below is to determine which day's data to return
      if (timeInHours >= 15 && timeInHours <= 24) {
        return format('yyyy-MM-dd')(addDays(1)(date));
      }
    }

    return format('yyyy-MM-dd')(date);
  }
}

export default GetDeliveryListUseCase;
