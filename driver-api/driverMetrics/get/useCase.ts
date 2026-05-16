import { DeliveryTime } from '@calo-backend/enums';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import TimezoneService from '@calo-backend/services/TimezoneService';
import { addDays, addHours, format, getHours, subDays } from 'date-fns/fp';

import { Country } from '@calo/types';

import { makeDriverMetrics } from '../../libs/factories';

class GetDriverMetricsUseCase {
  constructor(private readonly routePlanRepository: RoutePlanRepository) {}

  private getStartShift(day: string, time: DeliveryTime, offset: number) {
    const shiftStartingData =
      time === DeliveryTime.morning
        ? {
            time: '07:00',
            deliveryTime: DeliveryTime.morning,
          }
        : time === DeliveryTime.earlyMorning
          ? {
              time: '02:00',
              deliveryTime: DeliveryTime.earlyMorning,
            }
          : {
              time: '17:00',
              deliveryTime: DeliveryTime.evening,
            };

    const startingHour = new Date(`${day} ${shiftStartingData.time}`).getUTCHours() - offset;
    const currentHour = new Date().getUTCHours();
    const canStartShift = currentHour === startingHour;
    return {
      canStartShift,
      deliveryTime: shiftStartingData.deliveryTime,
      startingTime: shiftStartingData.time,
    };
  }

  async exec(id: string, time: DeliveryTime, country: Country) {
    //here day is not delivery day but actual day of routePlan so no additional changes required
    const offsetInHours = parseInt(TimezoneService.getTimezoneOffset(country).split(':')[0]);
    const dayConsideringTimeZone = this.getDayConsideringTimeZone(offsetInHours, time, country);
    const routePlan = await this.routePlanRepository.getByDayIdTime(dayConsideringTimeZone, id, time);
    const timeCheck = this.getStartShift(dayConsideringTimeZone, time, offsetInHours);
    if (!routePlan) {
      return;
    }
    const response = makeDriverMetrics(timeCheck.canStartShift, timeCheck.startingTime, routePlan);

    return response;
  }

  private getDayConsideringTimeZone(offsetInHours: number, time: DeliveryTime, country: Country) {
    const nowUtc = Date.now();
    const nowInDriverTimezone = addHours(offsetInHours)(nowUtc);
    const localHour = getHours(nowInDriverTimezone);

    // Evening shift might run into next day: show previous day until cutoff (2 AM local for most; 6 AM for GB so driver isn't cut off at midnight).
    if (time === DeliveryTime.evening) {
      const cutoffHour = country === Country.GB ? 6 : 2;
      if (localHour >= 0 && localHour < cutoffHour) {
        return format('yyyy-MM-dd')(subDays(1)(nowInDriverTimezone));
      }
    }

    if (country === Country.GB && time === DeliveryTime.earlyMorning) {
      const timeInHours = getHours(nowUtc);
      if (timeInHours >= 15 && timeInHours <= 24) {
        return format('yyyy-MM-dd')(addDays(1)(nowUtc));
      }
    }

    return format('yyyy-MM-dd')(nowInDriverTimezone);
  }
}

export default GetDriverMetricsUseCase;
