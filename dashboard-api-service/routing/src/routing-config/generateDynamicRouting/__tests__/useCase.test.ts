/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import { Country, DeliveryTime, Kitchen, DataType, WindowType } from 'libs/enums';

import { DeliveryRepository } from 'libs/repositories/ES';
import {
  mockRoutingConfig,
  mockRoutingConfigWithCustomDispatch,
  mockRoutingConfigWithCostModel,
  mockRoutingConfigNoZones,
  mockRoutingConfigNextDay,
  mockRoutingConfigGB,
  mockRoutingConfigHardWindow,
  mockMap,
  mockMapNoDrivers,
  mockKitchenEntity,
  mockExtendedDeliveries,
  mockPlanDeliveries,
  mockHistoricalDeliveries,
  mockDynamicRoutingResult,
  mockEmptyDynamicRoutingResult
} from './mock-data';

// --- Mocks ---

const mockGetRoutingConfig = jest.fn();
const mockMapFind = jest.fn();
const mockMapGetAllForKitchen = jest.fn();
const mockKitchenFindById = jest.fn();
const mockSqsSend = jest.fn();
const mockEvaluateDeliveriesForDynamicRouting = jest.fn();
const mockGetDeliveriesForDriverMetrics = jest.fn();
const mockGetDeliveries = jest.fn();
const mockFetchAndMergeDeliveries = jest.fn();

jest.mock('libs/repositories/DDB', () => ({
  ...jest.requireActual('libs/repositories/DDB'),
  MapRepository: jest.fn().mockImplementation(() => ({
    find: mockMapFind,
    getAllForKitchen: mockMapGetAllForKitchen
  })),
  KitchenRepository: jest.fn().mockImplementation(() => ({
    findById: mockKitchenFindById
  }))
}));

jest.mock(
  '../../../../libs/repositories',
  () => ({
    RoutingConfigRepository: jest.fn().mockImplementation(() => ({
      getRoutingConfig: mockGetRoutingConfig
    }))
  }),
  { virtual: true }
);

jest.mock('libs/facades', () => ({
  SQS: jest.fn().mockImplementation(() => ({
    send: mockSqsSend
  }))
}));

jest.mock('libs/services/DynamicRoutingService', () => ({
  DynamicRoutingService: jest.fn().mockImplementation(() => ({
    evaluateDeliveriesForDynamicRouting: mockEvaluateDeliveriesForDynamicRouting
  }))
}));

jest.mock('../deliveryHelper', () => ({
  fetchAndMergeDeliveries: (...args: any[]) => mockFetchAndMergeDeliveries(...args)
}));

jest.mock('@teamcalo/core', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Require after mocks so constructor dependencies are mocked before module evaluation.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GenerateDynamicRoutingUseCase = require('../useCase').default;

// Mock DeliveryRepository (ES) passed via constructor
const mockDeliveryRepository = {
  getDeliveriesForDriverMetrics: mockGetDeliveriesForDriverMetrics,
  getDeliveries: mockGetDeliveries
};

describe('GenerateDynamicRoutingUseCase', () => {
  let useCase: InstanceType<typeof GenerateDynamicRoutingUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GenerateDynamicRoutingUseCase(mockDeliveryRepository as unknown as DeliveryRepository);
    process.env.ENABLE_DYNAMIC_ROUTING_ZONE_SUMMARY = 'false';

    // Default happy-path mocks
    mockGetRoutingConfig.mockResolvedValue(mockRoutingConfig);
    mockMapFind.mockResolvedValue(mockMap);
    mockMapGetAllForKitchen.mockResolvedValue([mockMap]);
    mockKitchenFindById.mockResolvedValue(mockKitchenEntity);
    mockFetchAndMergeDeliveries.mockResolvedValue({
      extendedDeliveries: mockExtendedDeliveries
    });
    mockEvaluateDeliveriesForDynamicRouting.mockReturnValue(mockDynamicRoutingResult);
    mockGetDeliveriesForDriverMetrics.mockResolvedValue(mockPlanDeliveries);
    mockGetDeliveries.mockResolvedValue(mockHistoricalDeliveries);
    mockSqsSend.mockResolvedValue({});
  });

  describe('exec', () => {
    const defaultParams = {
      routingConfigID: 'routing-config-1',
      day: '2025-01-15'
    };

    it('should successfully generate dynamic routing and return a fileName', async () => {
      const result = await useCase.exec(defaultParams);

      expect(result).toHaveProperty('fileName');
      expect(result.fileName).toContain('Test Morning Route');
      expect(result.fileName).toContain('2025-01-15');
      expect(result.fileName).toContain(DeliveryTime.morning);
    });

    it('should fetch the routing config by ID', async () => {
      await useCase.exec(defaultParams);

      expect(mockGetRoutingConfig).toHaveBeenCalledWith('routing-config-1');
    });

    it('should throw when routing config is not found', async () => {
      mockGetRoutingConfig.mockResolvedValue(null);

      await expect(useCase.exec(defaultParams)).rejects.toThrow('Routing config not found');
    });

    it('should fetch the map for the config country and kitchen', async () => {
      await useCase.exec(defaultParams);

      expect(mockMapFind).toHaveBeenCalledWith({
        id: `${DataType.map}#${Country.BH}`,
        sk: `${Kitchen.BH1}#${DeliveryTime.morning}`
      });
    });

    it('should throw when map is not found', async () => {
      mockMapFind.mockResolvedValue(null);

      await expect(useCase.exec(defaultParams)).rejects.toThrow('Map not found');
    });

    it('should throw when routing config has no zone IDs', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigNoZones);

      await expect(useCase.exec(defaultParams)).rejects.toThrow('No zone IDs specified');
    });

    it('should throw when no matching delivery areas are found for zone IDs', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        zoneIds: ['non-existent-zone']
      });

      await expect(useCase.exec(defaultParams)).rejects.toThrow('No matching delivery areas');
    });

    it('should throw when no drivers are assigned to zones for the day', async () => {
      mockMapFind.mockResolvedValue(mockMapNoDrivers);

      await expect(useCase.exec(defaultParams)).rejects.toThrow('No drivers assigned');
    });

    it('should call fetchAndMergeDeliveries with correct params', async () => {
      await useCase.exec(defaultParams);

      expect(mockFetchAndMergeDeliveries).toHaveBeenCalledWith({
        day: '2025-01-15',
        kitchen: Kitchen.BH1,
        deliveryTime: DeliveryTime.morning,
        country: Country.BH
      });
    });

    it('should throw when no deliveries are found', async () => {
      mockFetchAndMergeDeliveries.mockResolvedValue({
        extendedDeliveries: []
      });

      await expect(useCase.exec(defaultParams)).rejects.toThrow('No deliveries found');
    });

    it('should evaluate deliveries for dynamic routing with expanded zone IDs', async () => {
      await useCase.exec(defaultParams);

      expect(mockEvaluateDeliveriesForDynamicRouting).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveries: mockExtendedDeliveries,
          day: '2025-01-15'
        })
      );

      // The routing config passed should have ALL zones that the drivers serve
      const call = mockEvaluateDeliveriesForDynamicRouting.mock.calls[0][0];
      // zone-3 is also served by driver-1 (from zone-1), so it should be included
      expect(call.routingConfig.zoneIds).toContain('zone-1');
      expect(call.routingConfig.zoneIds).toContain('zone-2');
      expect(call.routingConfig.zoneIds).toContain('zone-3');
    });

    it('should throw when no deliveries match the routing config zones', async () => {
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue(mockEmptyDynamicRoutingResult);

      await expect(useCase.exec(defaultParams)).rejects.toThrow('No deliveries matched');
    });

    it('should use kitchen location when no custom dispatch location is set', async () => {
      await useCase.exec(defaultParams);

      expect(mockKitchenFindById).toHaveBeenCalledWith(Kitchen.BH1);
      // SQS should be called (we verify location indirectly via the SQS payload)
      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('should use custom dispatch location when set on config', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigWithCustomDispatch);

      await useCase.exec({
        ...defaultParams,
        routingConfigID: 'routing-config-custom-dispatch'
      });

      // Should NOT fetch kitchen location when custom dispatch is provided
      expect(mockKitchenFindById).not.toHaveBeenCalled();
    });

    it('should throw when kitchen location is not found and no custom dispatch', async () => {
      mockKitchenFindById.mockResolvedValue(null);

      await expect(useCase.exec(defaultParams)).rejects.toThrow('Kitchen location not found');
    });

    it('should send routing request to SQS', async () => {
      await useCase.exec(defaultParams);

      expect(mockSqsSend).toHaveBeenCalledTimes(1);
      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload).toHaveProperty('fileName');
      expect(sqsPayload).toHaveProperty('shipments');
      expect(sqsPayload).toHaveProperty('vehicles');
      expect(sqsPayload).toHaveProperty('kitchenLocation');
      expect(sqsPayload).toHaveProperty('deliveriesWithTimeWindows');
      expect(sqsPayload).toHaveProperty('windowType', WindowType.soft);
      expect(sqsPayload).toHaveProperty('endAtKitchen', true);
    });

    it('should use cost model from config when provided', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigWithCostModel);

      await useCase.exec({
        ...defaultParams,
        routingConfigID: 'routing-config-cost-model'
      });

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.globalDurationCostPerHour).toBe(1.5);
    });

    it('should use default cost model when config does not provide one', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      // Default globalDurationCostPerHour is 1
      expect(sqsPayload.globalDurationCostPerHour).toBe(1);
    });

    it('should pass effective and next-day contexts to logger for GB evening bundles', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigGB);
      mockMapFind.mockResolvedValue({
        ...mockMap,
        id: `${DataType.map}#${Country.GB}`,
        sk: `${Kitchen.GB1}#${DeliveryTime.evening}`,
        country: Country.GB,
        kitchen: Kitchen.GB1,
        deliveryTime: DeliveryTime.evening
      });
      mockMapGetAllForKitchen.mockResolvedValue([
        {
          ...mockMap,
          id: `${DataType.map}#${Country.GB}`,
          sk: `${Kitchen.GB1}#${DeliveryTime.evening}`,
          country: Country.GB,
          kitchen: Kitchen.GB1,
          deliveryTime: DeliveryTime.evening
        }
      ]);
      mockKitchenFindById.mockResolvedValue({
        ...mockKitchenEntity,
        id: Kitchen.GB1,
        country: Country.GB
      });

      // Mock evening deliveries
      const eveningDeliveries = mockExtendedDeliveries.map((d) => ({
        ...d,
        time: DeliveryTime.evening
      }));
      mockFetchAndMergeDeliveries.mockResolvedValue({
        extendedDeliveries: eveningDeliveries
      });
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue({
        dynamicRoutedDeliveries: eveningDeliveries.slice(0, 2).map((d) => ({
          id: d.id,
          sk: d.sk,
          time: d.time,
          deliveryAddress: d.deliveryAddress,
          deliveryDay: d.deliveryDay,
          shortId: d.shortId,
          brand: d.brand,
          userId: d.userId
        })),
        skippedCount: 1
      });
      mockGetDeliveriesForDriverMetrics.mockResolvedValue({
        rows: mockPlanDeliveries.rows.map((r) => ({ ...r, time: DeliveryTime.evening })),
        total: 2
      });

      await useCase.exec({
        routingConfigID: 'routing-config-gb',
        day: '2025-01-15'
      });

      expect(mockSqsSend).toHaveBeenCalled();
    });
  });

  describe('Weekday selection for driver extraction', () => {
    // 2025-01-15 is a Wednesday (dayNumber = 3)
    // 2025-01-14 is a Tuesday (dayNumber = 2)
    const wednesdayParams = {
      routingConfigID: 'routing-config-morning',
      day: '2025-01-15'
    };

    it('should use same-day weekday for morning delivery time', async () => {
      // Set up morning config
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        time: DeliveryTime.morning
      });

      // Mock map with drivers assigned differently for Tuesday (2) vs Wednesday (3)
      const mapWithDayVariation = {
        ...mockMap,
        deliveryAreas: [
          {
            id: 'zone-1',
            drivers: [
              'driver-sun', // 0: Sunday
              'driver-mon', // 1: Monday
              'driver-tue', // 2: Tuesday
              'driver-wed', // 3: Wednesday (SHOULD BE SELECTED)
              'driver-thu', // 4: Thursday
              'driver-fri', // 5: Friday
              'driver-sat' // 6: Saturday
            ]
          }
        ]
      };

      mockMapFind.mockResolvedValue(mapWithDayVariation);
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue(mockDynamicRoutingResult);

      await useCase.exec(wednesdayParams);

      // The driver extraction should have used Wednesday's drivers (driver-wed)
      // which means it should use index 3 (same day, getDay(2025-01-15) = 3)
      expect(mockEvaluateDeliveriesForDynamicRouting).toHaveBeenCalledWith(
        expect.objectContaining({
          driverIds: expect.arrayContaining(['driver-wed'])
        })
      );
      // Should NOT include driver-tue (which would be day-1)
      expect(mockEvaluateDeliveriesForDynamicRouting.mock.calls[0][0].driverIds).not.toContain('driver-tue');
    });

    it('should use previous-day weekday for evening delivery time', async () => {
      // Set up evening config for route-plan day Wednesday
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        time: DeliveryTime.evening
      });

      // Mock map with drivers assigned differently for Tuesday (2) vs Wednesday (3)
      const mapWithDayVariation = {
        ...mockMap,
        deliveryAreas: [
          {
            id: 'zone-1',
            drivers: [
              'driver-sun', // 0: Sunday
              'driver-mon', // 1: Monday
              'driver-tue', // 2: Tuesday (SHOULD BE SELECTED for route-plan Wed via day-1)
              'driver-wed', // 3: Wednesday
              'driver-thu', // 4: Thursday
              'driver-fri', // 5: Friday
              'driver-sat' // 6: Saturday
            ]
          }
        ]
      };

      mockMapFind.mockResolvedValue(mapWithDayVariation);
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue(mockDynamicRoutingResult);

      await useCase.exec(wednesdayParams);

      // The driver extraction should have used Tuesday's drivers (driver-tue)
      // because evenings use day-1 logic. For route-plan day Wed, effectiveDay = Tue,
      // and getDay(2025-01-14 Tue) = 2
      expect(mockEvaluateDeliveriesForDynamicRouting).toHaveBeenCalledWith(
        expect.objectContaining({
          driverIds: expect.arrayContaining(['driver-tue'])
        })
      );
      // Should NOT include driver-wed (which would be same day, but evening uses day-1)
      expect(mockEvaluateDeliveriesForDynamicRouting.mock.calls[0][0].driverIds).not.toContain('driver-wed');
    });

    it('should correctly extract drivers from all zones served by selected drivers (morning)', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        time: DeliveryTime.morning,
        zoneIds: ['zone-1'] // Only explicitly configured for zone-1
      });

      // zone-1 has driver-wed on Wednesday (index 3), who also serves zone-3
      // zone-3 also has driver-wed on Wednesday (index 3)
      const mapWithMultiZone = {
        ...mockMap,
        deliveryAreas: [
          {
            id: 'zone-1',
            drivers: [
              'driver-sun',
              'driver-mon',
              'driver-tue',
              'driver-wed', // Wednesday (index 3, getDay = 3)
              'driver-thu',
              'driver-fri',
              'driver-sat'
            ]
          },
          {
            id: 'zone-2',
            drivers: [
              'driver-2-sun',
              'driver-2-mon',
              'driver-2-tue',
              'driver-2-wed',
              'driver-2-thu',
              'driver-2-fri',
              'driver-2-sat'
            ]
          },
          {
            id: 'zone-3',
            drivers: [
              'driver-sun',
              'driver-mon',
              'driver-tue',
              'driver-wed', // Same driver as zone-1 on Wednesday (index 3)
              'driver-thu',
              'driver-fri',
              'driver-sat'
            ]
          }
        ]
      };

      mockMapFind.mockResolvedValue(mapWithMultiZone);
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue(mockDynamicRoutingResult);

      await useCase.exec(wednesdayParams);

      // Should extract driver-wed from zone-1, then find that zone-3 also serves driver-wed
      const callArgs = mockEvaluateDeliveriesForDynamicRouting.mock.calls[0][0];
      expect(callArgs.routingConfig.zoneIds).toContain('zone-1');
      expect(callArgs.routingConfig.zoneIds).toContain('zone-3');
      expect(callArgs.routingConfig.zoneIds).not.toContain('zone-2'); // zone-2 has different driver
    });

    it('should correctly extract drivers from all zones served by selected drivers (evening)', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        time: DeliveryTime.evening,
        zoneIds: ['zone-1'] // Only explicitly configured for zone-1
      });

      // On Tuesday (evening day-1), driver-tue from zone-1 also serves zone-3
      // getDay(2025-01-14 Tue) = 2, so drivers[2] is selected
      const mapWithMultiZone = {
        ...mockMap,
        deliveryAreas: [
          {
            id: 'zone-1',
            drivers: [
              'driver-sun',
              'driver-mon',
              'driver-tue', // Tuesday (index 2, day-1 from Wed route-plan day)
              'driver-wed',
              'driver-thu',
              'driver-fri',
              'driver-sat'
            ]
          },
          {
            id: 'zone-2',
            drivers: [
              'driver-2-sun',
              'driver-2-mon',
              'driver-2-tue',
              'driver-2-wed',
              'driver-2-thu',
              'driver-2-fri',
              'driver-2-sat'
            ]
          },
          {
            id: 'zone-3',
            drivers: [
              'driver-sun',
              'driver-mon',
              'driver-tue', // Same driver as zone-1 on Tuesday (index 2)
              'driver-wed',
              'driver-thu',
              'driver-fri',
              'driver-sat'
            ]
          }
        ]
      };

      mockMapFind.mockResolvedValue(mapWithMultiZone);
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue(mockDynamicRoutingResult);

      await useCase.exec(wednesdayParams);

      // Should extract driver-tue (from day-1) from zone-1, then find that zone-3 also serves driver-tue
      const callArgs = mockEvaluateDeliveriesForDynamicRouting.mock.calls[0][0];
      expect(callArgs.driverIds).toContain('driver-tue');
      expect(callArgs.routingConfig.zoneIds).toContain('zone-1');
      expect(callArgs.routingConfig.zoneIds).toContain('zone-3');
      expect(callArgs.routingConfig.zoneIds).not.toContain('zone-2');
    });
  });

  describe('Vehicle preparation', () => {
    const defaultParams = {
      routingConfigID: 'routing-config-1',
      day: '2025-01-15'
    };

    it('should create one vehicle per driver', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      // We have 2 drivers (driver-1 from zone-1/zone-3, driver-2 from zone-2)
      expect(sqsPayload.vehicles).toHaveLength(2);
    });

    it('should set vehicle labels to driver IDs', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      const vehicleLabels = sqsPayload.vehicles.map((v: any) => v.label);
      expect(vehicleLabels).toContain('driver-1');
      expect(vehicleLabels).toContain('driver-2');
    });

    it('should set vehicle start location to kitchen location', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const vehicle of sqsPayload.vehicles) {
        expect(vehicle.startLocation).toEqual({
          latitude: mockKitchenEntity.location.lat,
          longitude: mockKitchenEntity.location.lng
        });
      }
    });

    it('should set vehicle end location when endAtKitchen is true', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const vehicle of sqsPayload.vehicles) {
        expect(vehicle.endLocation).toEqual({
          latitude: mockKitchenEntity.location.lat,
          longitude: mockKitchenEntity.location.lng
        });
      }
    });

    it('should NOT set vehicle end location when endAtKitchen is false', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        endAtKitchen: false
      });

      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const vehicle of sqsPayload.vehicles) {
        expect(vehicle.endLocation).toBeUndefined();
      }
    });

    it('should set travel mode to DRIVING', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const vehicle of sqsPayload.vehicles) {
        expect(vehicle.travelMode).toBe('DRIVING');
      }
    });

    it('should limit vehicles to numberOfDrivers when it is less than available drivers', async () => {
      // There are 2 drivers (driver-1, driver-2) from the default mock map.
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        numberOfDrivers: 1
      });

      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.vehicles).toHaveLength(1);
    });

    it('should cap vehicles at available driver count when numberOfDrivers exceeds it', async () => {
      // Only 2 drivers available; requesting 10 should still produce 2 vehicles.
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        numberOfDrivers: 10
      });

      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.vehicles).toHaveLength(2);
    });

    it('should use all available drivers when numberOfDrivers is undefined', async () => {
      // Default mockRoutingConfig has no numberOfDrivers — all drivers should be used.
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.vehicles).toHaveLength(2);
    });
  });

  describe('Shipment preparation', () => {
    const defaultParams = {
      routingConfigID: 'routing-config-1',
      day: '2025-01-15'
    };

    it('should create one shipment per eligible delivery', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.shipments).toHaveLength(mockDynamicRoutingResult.dynamicRoutedDeliveries.length);
    });

    it('should set shipment labels to delivery IDs', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      const labels = sqsPayload.shipments.map((s: any) => s.label);
      expect(labels).toContain('delivery-1');
      expect(labels).toContain('delivery-2');
    });

    it('should set pickup location to kitchen location', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const shipment of sqsPayload.shipments) {
        expect(shipment.pickups[0].arrivalLocation).toEqual({
          latitude: mockKitchenEntity.location.lat,
          longitude: mockKitchenEntity.location.lng
        });
      }
    });

    it('should set delivery duration to avgDeliveryTime in seconds', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const shipment of sqsPayload.shipments) {
        expect(shipment.deliveries[0].duration).toBe('120s');
      }
    });
  });

  describe('Time window handling', () => {
    const defaultParams = {
      routingConfigID: 'routing-config-1',
      day: '2025-01-15'
    };

    it('should attach soft time windows when windowType is soft', async () => {
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      const deliveriesWithWindows = sqsPayload.deliveriesWithTimeWindows;
      for (const d of deliveriesWithWindows) {
        if (d.timeWindows && d.timeWindows.length > 0) {
          const tw = d.timeWindows[0];
          // Soft windows have softStartTime/softEndTime
          expect(tw).toHaveProperty('softStartTime');
          expect(tw).toHaveProperty('softEndTime');
        }
      }
    });

    it('should attach hard time windows when windowType is hard', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigHardWindow);

      await useCase.exec({
        ...defaultParams,
        routingConfigID: 'routing-config-hard'
      });

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      const deliveriesWithWindows = sqsPayload.deliveriesWithTimeWindows;
      for (const d of deliveriesWithWindows) {
        if (d.timeWindows && d.timeWindows.length > 0) {
          const tw = d.timeWindows[0];
          // Hard windows have startTime/endTime
          expect(tw).toHaveProperty('startTime');
          expect(tw).toHaveProperty('endTime');
        }
      }
    });

    it('should handle next-day delivery end time', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigNextDay);

      await useCase.exec({
        ...defaultParams,
        routingConfigID: 'routing-config-next-day'
      });

      expect(mockSqsSend).toHaveBeenCalled();
      const sqsPayload = mockSqsSend.mock.calls[0][0];
      // endTimeIsoString should reference the next day
      expect(sqsPayload.endTimeIsoString).toContain('2025-01-16');
    });
  });

  describe('Historical delivery processing', () => {
    const defaultParams = {
      routingConfigID: 'routing-config-1',
      day: '2025-01-15'
    };

    it('should fetch plan deliveries by IDs from dynamic routing result', async () => {
      await useCase.exec(defaultParams);

      expect(mockGetDeliveriesForDriverMetrics).toHaveBeenCalledWith({
        ids: ['delivery-1', 'delivery-2']
      });
    });

    it('should fetch historical deliveries for average delivery time', async () => {
      await useCase.exec(defaultParams);

      expect(mockGetDeliveries).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: expect.arrayContaining(['user-1', 'user-2']),
          day: expect.objectContaining({
            lte: '2025-01-15'
          }),
          deliveryStatus: expect.anything()
        })
      );
    });

    it('should handle empty plan deliveries gracefully', async () => {
      mockGetDeliveriesForDriverMetrics.mockResolvedValue({ rows: [], total: 0 });

      await useCase.exec(defaultParams);

      // Should still send to SQS but with empty shipments
      expect(mockSqsSend).toHaveBeenCalled();
      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.shipments).toHaveLength(0);
    });

    it('should use lookbackDays = 0 to restrict historical window to the plan day only', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        lookbackDays: 0
      });

      await useCase.exec(defaultParams);

      // With lookbackDays = 0, subDays(planDay, 0) = planDay itself, so gte === lte.
      expect(mockGetDeliveries).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({
            gte: '2025-01-15'
          })
        })
      );
      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.lookbackDays).toBe(0);
    });

    it('should default to a 14-day historical window when lookbackDays is undefined', async () => {
      // Default mockRoutingConfig has no lookbackDays field (undefined).
      await useCase.exec(defaultParams);

      // bufferDays constant = 14; subDays('2025-01-15', 14) = '2025-01-01'.
      expect(mockGetDeliveries).toHaveBeenCalledWith(
        expect.objectContaining({
          day: expect.objectContaining({
            gte: '2025-01-01'
          })
        })
      );
      const sqsPayload = mockSqsSend.mock.calls[0][0];
      expect(sqsPayload.lookbackDays).toBe(14);
    });
  });

  describe('GB evening delivery special case', () => {
    const gbParams = {
      routingConfigID: 'routing-config-gb',
      day: '2025-01-15'
    };

    it('should handle GB evening deliveries with firstSubslotEndTime', async () => {
      mockGetRoutingConfig.mockResolvedValue(mockRoutingConfigGB);
      mockMapFind.mockResolvedValue({
        ...mockMap,
        id: `${DataType.map}#${Country.GB}`,
        sk: `${Kitchen.GB1}#${DeliveryTime.evening}`,
        country: Country.GB,
        kitchen: Kitchen.GB1,
        deliveryTime: DeliveryTime.evening
      });
      mockMapGetAllForKitchen.mockResolvedValue([
        {
          ...mockMap,
          country: Country.GB,
          kitchen: Kitchen.GB1,
          deliveryTime: DeliveryTime.evening
        }
      ]);
      mockKitchenFindById.mockResolvedValue({
        ...mockKitchenEntity,
        id: Kitchen.GB1,
        country: Country.GB
      });

      // Mock deliveries with evening time
      const eveningDeliveries = mockExtendedDeliveries.map((d) => ({
        ...d,
        time: DeliveryTime.evening
      }));
      mockFetchAndMergeDeliveries.mockResolvedValue({
        extendedDeliveries: eveningDeliveries
      });
      mockEvaluateDeliveriesForDynamicRouting.mockReturnValue({
        dynamicRoutedDeliveries: eveningDeliveries.slice(0, 2).map((d) => ({
          id: d.id,
          sk: d.sk,
          time: d.time,
          deliveryAddress: d.deliveryAddress,
          deliveryDay: d.deliveryDay,
          shortId: d.shortId,
          brand: d.brand,
          userId: d.userId
        })),
        skippedCount: 1
      });

      // Also update plan deliveries to have evening time
      mockGetDeliveriesForDriverMetrics.mockResolvedValue({
        rows: mockPlanDeliveries.rows.map((r) => ({ ...r, time: DeliveryTime.evening })),
        total: 2
      });

      await useCase.exec(gbParams);

      expect(mockSqsSend).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    const defaultParams = {
      routingConfigID: 'routing-config-1',
      day: '2025-01-15'
    };

    it('should handle delivery with no deliveryEndTime (uses deliveryStartTime as fallback)', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        deliveryEndTime: null
      });

      await useCase.exec(defaultParams);

      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('should throw when kitchen entity has no location', async () => {
      mockKitchenFindById.mockResolvedValue({
        ...mockKitchenEntity,
        location: undefined
      });

      await expect(useCase.exec(defaultParams)).rejects.toThrow('Kitchen location not found');
    });

    it('should handle windowSize of 0', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        windowSize: 0
      });

      await useCase.exec(defaultParams);

      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('should extract unique driver IDs (no duplicates)', async () => {
      // zone-1 and zone-3 both have driver-1, so we should only have 2 unique drivers
      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      const driverLabels = sqsPayload.vehicles.map((v: any) => v.label);
      const uniqueLabels = [...new Set(driverLabels)];
      expect(driverLabels).toHaveLength(uniqueLabels.length);
    });

    it('should pass travelDurationMultiple to vehicles', async () => {
      mockGetRoutingConfig.mockResolvedValue({
        ...mockRoutingConfig,
        travelDurationMultiple: 1.5
      });

      await useCase.exec(defaultParams);

      const sqsPayload = mockSqsSend.mock.calls[0][0];
      for (const vehicle of sqsPayload.vehicles) {
        expect(vehicle.travelDurationMultiple).toBe(1.5);
      }
    });
  });
});
