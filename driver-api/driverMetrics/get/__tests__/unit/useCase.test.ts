import { DeliveryTime } from '@calo-backend/enums';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { addDays, addHours, format, getHours, subDays } from 'date-fns/fp';

import { Country } from '@calo/types';

import { routePlanEntity, refactoredForDriver } from '../../../../__mocks__/mock';
import * as Factory from '../../../../libs/factories/RoutePlanFactory';
import GetDriverMetricsUseCase from '../../useCase';

/**
 * Helper to compute expected day considering timezone logic.
 * Required because getHours() uses system local timezone.
 */
const computeExpectedDay = (utcTimestamp: number, offsetInHours: number, time: DeliveryTime, country: Country) => {
  const nowInDriverTimezone = addHours(offsetInHours)(utcTimestamp);
  const localHour = getHours(nowInDriverTimezone);

  if (time === DeliveryTime.evening) {
    const cutoffHour = country === Country.GB ? 6 : 2;
    if (localHour >= 0 && localHour < cutoffHour) {
      return format('yyyy-MM-dd')(subDays(1)(nowInDriverTimezone));
    }
  }

  if (country === Country.GB && time === DeliveryTime.earlyMorning) {
    const timeInHours = getHours(utcTimestamp);
    if (timeInHours >= 15 && timeInHours <= 24) {
      return format('yyyy-MM-dd')(addDays(1)(utcTimestamp));
    }
  }

  return format('yyyy-MM-dd')(nowInDriverTimezone);
};

describe('test get driver metrics use case', () => {
  let routePlanRepository: RoutePlanRepository;
  let useCase: GetDriverMetricsUseCase;
  let repoSpy: jest.SpyInstance;

  beforeEach(() => {
    routePlanRepository = new RoutePlanRepository();
    repoSpy = jest.spyOn(routePlanRepository, 'getByDayIdTime').mockResolvedValue(routePlanEntity);
    jest.spyOn(Factory, 'makeDriverMetrics').mockReturnValue(refactoredForDriver);
    useCase = new GetDriverMetricsUseCase(routePlanRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should find and return existing driver metrics', async () => {
    const res = await useCase.exec('123', DeliveryTime.morning, Country.BH);

    expect(repoSpy).toHaveBeenCalled();
    const dayConsideringTimeZone = format('yyyy-MM-dd')(addHours(3)(Date.now()));
    expect(repoSpy).toHaveBeenCalledWith(dayConsideringTimeZone, '123', 'morning');
    expect(res).toEqual(refactoredForDriver);
  });

  test('should return previous day for evening shift before 2 AM cutoff (non-GB)', async () => {
    const mockTime = new Date('2024-02-15T22:00:00Z').getTime(); // 1 AM in BH (UTC+3)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const res = await useCase.exec('123', DeliveryTime.evening, Country.BH);

    const expectedDay = computeExpectedDay(mockTime, 3, DeliveryTime.evening, Country.BH);
    expect(repoSpy).toHaveBeenCalledWith(expectedDay, '123', 'evening');
    expect(res).toEqual(refactoredForDriver);
  });

  test('should return current day for evening shift after 2 AM cutoff (non-GB)', async () => {
    const mockTime = new Date('2024-02-15T03:00:00Z').getTime(); // 6 AM in BH (UTC+3)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const res = await useCase.exec('123', DeliveryTime.evening, Country.BH);

    const expectedDay = computeExpectedDay(mockTime, 3, DeliveryTime.evening, Country.BH);
    expect(repoSpy).toHaveBeenCalledWith(expectedDay, '123', 'evening');
    expect(res).toEqual(refactoredForDriver);
  });

  test('should return previous day for evening shift before 6 AM cutoff (GB)', async () => {
    const mockTime = new Date('2024-02-15T03:00:00Z').getTime(); // 3 AM in GB (UTC+0)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const res = await useCase.exec('123', DeliveryTime.evening, Country.GB);

    const expectedDay = computeExpectedDay(mockTime, 0, DeliveryTime.evening, Country.GB);
    expect(repoSpy).toHaveBeenCalledWith(expectedDay, '123', 'evening');
    expect(res).toEqual(refactoredForDriver);
  });

  test('should return current day for evening shift after 6 AM cutoff (GB)', async () => {
    const mockTime = new Date('2024-02-15T10:00:00Z').getTime(); // 10 AM in GB (UTC+0)
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const res = await useCase.exec('123', DeliveryTime.evening, Country.GB);

    const expectedDay = computeExpectedDay(mockTime, 0, DeliveryTime.evening, Country.GB);
    expect(repoSpy).toHaveBeenCalledWith(expectedDay, '123', 'evening');
    expect(res).toEqual(refactoredForDriver);
  });

  test('should return next day for earlyMorning shift when UTC hour >= 15 (GB)', async () => {
    const mockTime = new Date('2024-02-15T20:00:00Z').getTime(); // 8 PM UTC
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const res = await useCase.exec('123', DeliveryTime.earlyMorning, Country.GB);

    const expectedDay = computeExpectedDay(mockTime, 0, DeliveryTime.earlyMorning, Country.GB);
    expect(repoSpy).toHaveBeenCalledWith(expectedDay, '123', 'earlyMorning');
    expect(res).toEqual(refactoredForDriver);
  });

  test('should return current day for earlyMorning shift when UTC hour < 15 (GB)', async () => {
    const mockTime = new Date('2024-02-15T10:00:00Z').getTime(); // 10 AM UTC
    jest.spyOn(Date, 'now').mockReturnValue(mockTime);

    const res = await useCase.exec('123', DeliveryTime.earlyMorning, Country.GB);

    const expectedDay = computeExpectedDay(mockTime, 0, DeliveryTime.earlyMorning, Country.GB);
    expect(repoSpy).toHaveBeenCalledWith(expectedDay, '123', 'earlyMorning');
    expect(res).toEqual(refactoredForDriver);
  });
});
