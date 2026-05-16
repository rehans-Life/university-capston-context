/* eslint-disable @typescript-eslint/no-explicit-any */
import { DriverService } from '../../DriverService';
import { DeliveryTime } from 'libs/enums';

jest.mock('@teamcalo/core', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

describe('DriverService (integration)', () => {
  describe('assignDriverToDeliveries', () => {
    it('should handle mixed matched/unmatched deliveries', () => {
      const deliveries = [
        { sk: 'del-1', deliveryAddress: {}, time: DeliveryTime.morning },
        { sk: 'del-2', deliveryAddress: {}, time: DeliveryTime.morning },
        { sk: 'del-3', deliveryAddress: {}, time: DeliveryTime.evening }
      ] as any[];

      const extraDeliveryData = {
        'del-1': { priority: 1, driverId: 'driver-a', driverName: 'Alice', shortId: 'M-AL-1', fk: 'fk' }
        // del-2 and del-3 have no extra data
      };

      const result = DriverService.assignDriverToDeliveries({ deliveries, extraDeliveryData });

      expect(result).toHaveLength(3);
      expect(result[0].driver).toEqual({ id: 'driver-a', name: 'Alice' });
      expect(result[1].driver).toBeUndefined();
      expect(result[2].driver).toBeUndefined();
    });
  });

  describe('incrementDriverDeliveriesCount', () => {
    it('should accumulate counts across multiple calls for different times', () => {
      const drivers = { 'driver-a': { id: 'driver-a', driverName: 'Alice' } } as any;

      const morningDeliveries = [
        { sk: 'del-1', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 6AG' } }
      ] as any[];

      const eveningDeliveries = [
        { sk: 'del-2', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 7BG' } },
        { sk: 'del-3', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 8CG' } }
      ] as any[];

      let counts = DriverService.incrementDriverDeliveriesCount(
        {},
        morningDeliveries,
        drivers,
        'driver-a',
        DeliveryTime.morning
      );

      counts = DriverService.incrementDriverDeliveriesCount(
        counts,
        eveningDeliveries,
        drivers,
        'driver-a',
        DeliveryTime.evening
      );

      expect(counts['driver-a']['W1U'][DeliveryTime.morning]).toBe(1);
      expect(counts['driver-a']['W1U'][DeliveryTime.evening]).toBe(2);
    });

    it('should handle multiple postal codes for the same driver', () => {
      const drivers = { 'driver-a': { id: 'driver-a', driverName: 'Alice' } } as any;

      const deliveries = [
        { sk: 'del-1', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 6AG' } },
        { sk: 'del-2', areaPostalCode: 'SW1A', deliveryAddress: { postalCode: 'SW1A 2AA' } },
        { sk: 'del-3', areaPostalCode: 'W1U', deliveryAddress: { postalCode: 'W1U 7BG' } }
      ] as any[];

      const counts = DriverService.incrementDriverDeliveriesCount(
        {},
        deliveries,
        drivers,
        'driver-a',
        DeliveryTime.morning
      );

      expect(counts['driver-a']['W1U'][DeliveryTime.morning]).toBe(2);
      expect(counts['driver-a']['SW1A'][DeliveryTime.morning]).toBe(1);
    });
  });
});
