import { DataType } from '@calo-backend/enums';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { isWithinInterval, startOfDay, addHours } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { NotFound } from 'http-errors';
import { RoutePoint } from 'src/libs/interfaces';
import { LocationRepository } from 'src/libs/repositories/API';

import { TimezoneService } from '@calo/services';
import { Country, Kitchen } from '@calo/types';

import { LatLng } from '@libs/driver-types';

export const generateRoute = async (
  locationRepository: LocationRepository,
  departurePosition: LatLng,
  routePoints: RoutePoint[],
  deliveryStartTime: string,
) => {
  const data = {
    departurePosition,
    routePoints,
    deliveryStartTime,
    optimize: false,
  };
  return await locationRepository.generateRoute(data);
};

export const fetchRoutePlan = async (routePlanRepository: RoutePlanRepository, id: string) => {
  const routePlanEntity = await routePlanRepository.find({ id: DataType.routePlanNew, sk: id });
  if (!routePlanEntity) {
    throw new NotFound('Route plan not found');
  }
  return routePlanEntity;
};

export const isWithinTimeRange = (kitchen: Kitchen, country: Country, currentDate: Date) => {
  const timeZone = TimezoneService.getTimeZoneForCountry(country);
  const localDate = utcToZonedTime(currentDate, timeZone);

  const startOfDayLocal = startOfDay(localDate);

  let morningStart, morningEnd;

  if (kitchen === Kitchen.GB1) {
    // (2:00 AM to 8:00 AM local)
    morningStart = addHours(startOfDayLocal, 2);
    morningEnd = addHours(startOfDayLocal, 8);
  } else {
    // (5:00 AM to 11:00 AM local)
    morningStart = addHours(startOfDayLocal, 5);
    morningEnd = addHours(startOfDayLocal, 11);
  }

  // (4:00 PM to 10:00 PM local)
  const eveningStart = addHours(startOfDayLocal, 16);
  const eveningEnd = addHours(startOfDayLocal, 22);

  return (
    isWithinInterval(localDate, { start: morningStart, end: morningEnd }) ||
    isWithinInterval(localDate, { start: eveningStart, end: eveningEnd })
  );
};
