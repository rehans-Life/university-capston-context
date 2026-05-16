/* eslint-disable @typescript-eslint/no-explicit-any */
import { DriverService } from '../../DriverService';
import { DeliveryTime } from 'libs/enums';

describe('DriverService.assignDriverToDeliveries', () => {
  it('should assign driver info from extraDeliveryData', () => {
    const deliveries = [
      { sk: 'del-1', deliveryAddress: {}, time: DeliveryTime.morning },
      { sk: 'del-2', deliveryAddress: {}, time: DeliveryTime.morning }
    ] as any[];

    const extraDeliveryData = {
      'del-1': { priority: 1, driverId: 'driver-a', driverName: 'Alice', shortId: 'M-AL-1', fk: 'fk' },
      'del-2': { priority: 2, driverId: 'driver-b', driverName: 'Bob', shortId: 'M-BO-1', fk: 'fk' }
    };

    const result = DriverService.assignDriverToDeliveries({ deliveries, extraDeliveryData });

    expect(result).toHaveLength(2);
    expect(result[0].driver).toEqual({ id: 'driver-a', name: 'Alice' });
    expect(result[0].shortId).toBe('M-AL-1');
    expect(result[0].priority).toBe(1);
    expect(result[1].driver).toEqual({ id: 'driver-b', name: 'Bob' });
  });

  it('should leave delivery unchanged if no extra data for its sk', () => {
    const deliveries = [{ sk: 'del-1', deliveryAddress: {}, time: DeliveryTime.morning }] as any[];

    const result = DriverService.assignDriverToDeliveries({ deliveries, extraDeliveryData: {} });

    expect(result).toHaveLength(1);
    expect(result[0].driver).toBeUndefined();
  });

  it('should return empty array for empty deliveries', () => {
    const result = DriverService.assignDriverToDeliveries({ deliveries: [], extraDeliveryData: {} });
    expect(result).toEqual([]);
  });

  it('should not mutate original delivery objects', () => {
    const original = { sk: 'del-1', deliveryAddress: {}, time: DeliveryTime.morning } as any;
    const deliveries = [original];
    const extraDeliveryData = {
      'del-1': { priority: 5, driverId: 'driver-x', driverName: 'Xavier', shortId: 'X-1', fk: 'fk' }
    };

    const result = DriverService.assignDriverToDeliveries({ deliveries, extraDeliveryData });

    // Result should have driver info
    expect(result[0].driver).toBeDefined();
    // Original should not be mutated (assignDriverToDeliveries uses spread)
    expect(original.driver).toBeUndefined();
  });
});

describe('DriverService.incrementDriverDeliveriesCount', () => {
  it('should increment counts for a driver by postal code and time', () => {
    const deliveries = [
      { sk: 'del-1', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 6AG' } },
      { sk: 'del-2', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 7BG' } }
    ] as any[];

    const drivers = { 'driver-a': { id: 'driver-a', driverName: 'Alice' } } as any;

    const result = DriverService.incrementDriverDeliveriesCount(
      {},
      deliveries,
      drivers,
      'driver-a',
      DeliveryTime.morning
    );

    expect(result['driver-a']['W1U'][DeliveryTime.morning]).toBe(2);
  });

  it('should not mutate the original count object', () => {
    const original = { 'driver-a': { W1U: { [DeliveryTime.morning]: 3 } } } as any;
    const deliveries = [{ sk: 'del-1', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 6AG' } }] as any[];
    const drivers = { 'driver-a': { id: 'driver-a', driverName: 'Alice' } } as any;

    const result = DriverService.incrementDriverDeliveriesCount(
      original,
      deliveries,
      drivers,
      'driver-a',
      DeliveryTime.morning
    );

    expect(result['driver-a']['W1U'][DeliveryTime.morning]).toBe(4);
    expect(original['driver-a']['W1U'][DeliveryTime.morning]).toBe(3);
  });

  it('should return unchanged counts when driver not found', () => {
    const deliveries = [{ sk: 'del-1', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 6AG' } }] as any[];
    const drivers = {} as any;

    const result = DriverService.incrementDriverDeliveriesCount(
      {},
      deliveries,
      drivers,
      'missing-driver',
      DeliveryTime.morning
    );

    expect(result['missing-driver']).toBeUndefined();
  });

  it('should return unchanged counts for empty deliveries', () => {
    const drivers = { 'driver-a': { id: 'driver-a', driverName: 'Alice' } } as any;
    const result = DriverService.incrementDriverDeliveriesCount({}, [], drivers, 'driver-a', DeliveryTime.morning);

    expect(result['driver-a']).toBeUndefined();
  });
});
