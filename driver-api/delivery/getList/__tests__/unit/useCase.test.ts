import { DeliveryEntity } from '@calo-backend/entities/DDB';
import { DeliveryTime } from '@calo-backend/enums';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { addDays, format, getHours } from 'date-fns/fp';
import { utcToZonedTime } from 'date-fns-tz';
import { keyBy } from 'lodash-es';
import { routePlanEntity } from 'src/__mocks__/mock';

import { TimezoneService } from '@calo/services';
import { Country, Currency, Kitchen } from '@calo/types';

import { deliveryEntity, subscriptionEntity } from '../../../../libs/mockData/data';
import { DeliveryEstimationRepository } from '../../../../libs/repositories/DDB';
import UseCase from '../../useCase';
import req from '../req';

const subscriptionRepository = new SubscriptionRepository();
const deliveryRepository = new DeliveryRepository();
const deliveryEstimationRepository = new DeliveryEstimationRepository();
const routePlanRepository = new RoutePlanRepository();
const esDeliveryRepository = new EsDeliveryRepository();

describe('should return deliveries list', () => {
  beforeAll(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2020-01-01T00:00:00Z').getTime());
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('test delivery get list use case', async () => {
    const spy1 = jest
      .spyOn(deliveryRepository, 'getDriverDeliveries')
      .mockImplementation(() => Promise.resolve([deliveryEntity]));
    const spy2 = jest
      .spyOn(subscriptionRepository, 'batchFindById')
      .mockImplementation(() => Promise.resolve([subscriptionEntity]));
    const spy3 = jest
      .spyOn(deliveryEstimationRepository, 'batchFindById')
      .mockImplementation(() => Promise.resolve([]));
    const spy4 = jest
      .spyOn(deliveryRepository, 'findDeliveryByDate')
      .mockImplementation(() => Promise.resolve({} as DeliveryEntity));
    const spy5 = jest
      .spyOn(routePlanRepository, 'getByDayIdTime')
      .mockImplementation(() => Promise.resolve(routePlanEntity));
    const spy6 = jest
      .spyOn(esDeliveryRepository, 'getNumberOfCoolerBagsToBeReturned')
      .mockImplementation(() => Promise.resolve([{ userId: 'test', bagsStillNeeded: 0 }]));

    const useCase = new UseCase(
      esDeliveryRepository,
      deliveryRepository,
      subscriptionRepository,
      deliveryEstimationRepository,
      routePlanRepository,
    );
    const res = await useCase.exec('123', req, Country.BH, Kitchen.BH1);

    expect(spy1).toBeCalled();

    expect(spy2).toBeCalled();
    expect(spy2).toBeCalledWith(['1']);

    expect(spy3).toBeCalled();
    expect(spy3).toBeCalledWith(['1', '1', '1']);

    if (subscriptionEntity.withCoolerBag) {
      expect(spy4).toBeCalled();
      expect(spy4).toBeCalledWith(subscriptionEntity.sk, subscriptionEntity.lastDeliveredDate);
    }

    expect(spy5).toHaveBeenCalledTimes(3);
    expect(spy5).toHaveBeenCalledWith('2020-01-01', '123', 'morning');
    expect(spy5).toHaveBeenCalledWith('2020-01-01', '123', 'evening');

    expect(spy6).toBeCalled();

    const keyed = keyBy([subscriptionEntity], 'id');
    // eslint-disable-next-line unicorn/prefer-object-from-entries
    let additionalData = [deliveryEntity].reduce((res, d) => {
      res[d.sk] = {
        pendingAmount: keyed[d.userId]?.pendingAmount[keyed[d.userId].currency] || 0,
        currency: keyed[d.userId]?.currency || Currency.BHD,
        groupBufferTime: 0,
        driverNote: keyed[d.userId]?.deliveryAddresses.find((a) => a.id === d.deliveryAddress.id)?.driverNote,
        priority: undefined,
        unreturnedCoolerBags: 0,
      };
      return res;
    }, {});

    expect(res).toEqual({
      deliveries: [deliveryEntity, deliveryEntity, deliveryEntity],
      additionalData,
    });
  });
});

/**
 * Helper to compute expected delivery day.
 * Required because getHours() uses system local timezone.
 */
const computeExpectedDeliveryDay = (date: Date, time: DeliveryTime, country: Country) => {
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
    if (timeInHours >= 15 && timeInHours <= 24) {
      return format('yyyy-MM-dd')(addDays(1)(date));
    }
  }

  return format('yyyy-MM-dd')(date);
};

/**
 * Expected output structure (same as original test)
 */
const getExpectedOutput = () => {
  const keyed = keyBy([subscriptionEntity], 'id');
  // eslint-disable-next-line unicorn/prefer-object-from-entries
  const additionalData = [deliveryEntity].reduce((res, d) => {
    res[d.sk] = {
      pendingAmount: keyed[d.userId]?.pendingAmount[keyed[d.userId].currency] || 0,
      currency: keyed[d.userId]?.currency || Currency.BHD,
      groupBufferTime: 0,
      driverNote: keyed[d.userId]?.deliveryAddresses.find((a) => a.id === d.deliveryAddress.id)?.driverNote,
      priority: undefined,
      unreturnedCoolerBags: 0,
    };
    return res;
  }, {});

  return {
    deliveries: [deliveryEntity, deliveryEntity, deliveryEntity],
    additionalData,
  };
};

describe('getDeliveryDay timezone logic', () => {
  let useCase: UseCase;
  let deliverySpy: jest.SpyInstance;

  beforeEach(() => {
    useCase = new UseCase(
      esDeliveryRepository,
      deliveryRepository,
      subscriptionRepository,
      deliveryEstimationRepository,
      routePlanRepository,
    );

    deliverySpy = jest.spyOn(deliveryRepository, 'getDriverDeliveries').mockResolvedValue([deliveryEntity]);
    jest.spyOn(subscriptionRepository, 'batchFindById').mockResolvedValue([subscriptionEntity]);
    jest.spyOn(deliveryEstimationRepository, 'batchFindById').mockResolvedValue([]);
    jest.spyOn(deliveryRepository, 'findDeliveryByDate').mockResolvedValue({} as DeliveryEntity);
    jest.spyOn(routePlanRepository, 'getByDayIdTime').mockResolvedValue(routePlanEntity);
    jest
      .spyOn(esDeliveryRepository, 'getNumberOfCoolerBagsToBeReturned')
      .mockResolvedValue([{ userId: 'test', bagsStillNeeded: 0 }]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should fetch evening deliveries for current day when before 2 AM cutoff (non-GB)', async () => {
    const mockTime = new Date('2024-02-15T22:00:00Z').getTime(); // 1 AM in BH (UTC+3)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const userTime = utcToZonedTime(mockTime, TimezoneService.getTimeZoneForCountry(Country.BH));
    const expectedEveningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.evening, Country.BH);
    const expectedMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.morning, Country.BH);
    const expectedEarlyMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.earlyMorning, Country.BH);

    const res = await useCase.exec('123', req, Country.BH, Kitchen.BH1);

    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEarlyMorningDay, Kitchen.BH1, DeliveryTime.earlyMorning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedMorningDay, Kitchen.BH1, DeliveryTime.morning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEveningDay, Kitchen.BH1, DeliveryTime.evening);
    expect(res).toEqual(getExpectedOutput());
  });

  test('should fetch evening deliveries for next day when after 2 AM cutoff (non-GB)', async () => {
    const mockTime = new Date('2024-02-15T03:00:00Z').getTime(); // 6 AM in BH (UTC+3)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const userTime = utcToZonedTime(mockTime, TimezoneService.getTimeZoneForCountry(Country.BH));
    const expectedEveningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.evening, Country.BH);
    const expectedMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.morning, Country.BH);
    const expectedEarlyMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.earlyMorning, Country.BH);

    const res = await useCase.exec('123', req, Country.BH, Kitchen.BH1);

    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEarlyMorningDay, Kitchen.BH1, DeliveryTime.earlyMorning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedMorningDay, Kitchen.BH1, DeliveryTime.morning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEveningDay, Kitchen.BH1, DeliveryTime.evening);
    expect(res).toEqual(getExpectedOutput());
  });

  test('should fetch evening deliveries for current day when before 6 AM cutoff (GB)', async () => {
    const mockTime = new Date('2024-02-15T03:00:00Z').getTime(); // 3 AM in GB (UTC+0)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const userTime = utcToZonedTime(mockTime, TimezoneService.getTimeZoneForCountry(Country.GB));
    const expectedEveningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.evening, Country.GB);
    const expectedMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.morning, Country.GB);
    const expectedEarlyMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.earlyMorning, Country.GB);

    const res = await useCase.exec('123', req, Country.GB, Kitchen.GB1);

    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEarlyMorningDay, Kitchen.GB1, DeliveryTime.earlyMorning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedMorningDay, Kitchen.GB1, DeliveryTime.morning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEveningDay, Kitchen.GB1, DeliveryTime.evening);
    expect(res).toEqual(getExpectedOutput());
  });

  test('should fetch evening deliveries for next day when after 6 AM cutoff (GB)', async () => {
    const mockTime = new Date('2024-02-15T10:00:00Z').getTime(); // 10 AM in GB (UTC+0)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const userTime = utcToZonedTime(mockTime, TimezoneService.getTimeZoneForCountry(Country.GB));
    const expectedEveningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.evening, Country.GB);
    const expectedMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.morning, Country.GB);
    const expectedEarlyMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.earlyMorning, Country.GB);

    const res = await useCase.exec('123', req, Country.GB, Kitchen.GB1);

    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEarlyMorningDay, Kitchen.GB1, DeliveryTime.earlyMorning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedMorningDay, Kitchen.GB1, DeliveryTime.morning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEveningDay, Kitchen.GB1, DeliveryTime.evening);
    expect(res).toEqual(getExpectedOutput());
  });

  test('should fetch earlyMorning deliveries for next day when hour >= 15 (GB)', async () => {
    const mockTime = new Date('2024-02-15T20:00:00Z').getTime(); // 8 PM UTC
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const userTime = utcToZonedTime(mockTime, TimezoneService.getTimeZoneForCountry(Country.GB));
    const expectedEveningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.evening, Country.GB);
    const expectedMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.morning, Country.GB);
    const expectedEarlyMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.earlyMorning, Country.GB);

    const res = await useCase.exec('123', req, Country.GB, Kitchen.GB1);

    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEarlyMorningDay, Kitchen.GB1, DeliveryTime.earlyMorning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedMorningDay, Kitchen.GB1, DeliveryTime.morning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEveningDay, Kitchen.GB1, DeliveryTime.evening);
    expect(res).toEqual(getExpectedOutput());
  });

  test('should fetch earlyMorning deliveries for current day when hour < 15 (GB)', async () => {
    const mockTime = new Date('2024-02-15T10:00:00Z').getTime(); // 10 AM UTC
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const userTime = utcToZonedTime(mockTime, TimezoneService.getTimeZoneForCountry(Country.GB));
    const expectedEveningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.evening, Country.GB);
    const expectedMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.morning, Country.GB);
    const expectedEarlyMorningDay = computeExpectedDeliveryDay(userTime, DeliveryTime.earlyMorning, Country.GB);

    const res = await useCase.exec('123', req, Country.GB, Kitchen.GB1);

    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEarlyMorningDay, Kitchen.GB1, DeliveryTime.earlyMorning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedMorningDay, Kitchen.GB1, DeliveryTime.morning);
    expect(deliverySpy).toHaveBeenCalledWith('123', expectedEveningDay, Kitchen.GB1, DeliveryTime.evening);
    expect(res).toEqual(getExpectedOutput());
  });
});
