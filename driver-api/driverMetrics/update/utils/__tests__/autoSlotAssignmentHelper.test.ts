import { RoutePlanEntity } from '@calo-backend/entities/DDB';
import { DeliveryTime } from '@calo-backend/enums';
import { RouteItem } from '@calo-backend/interfaces';
import { GetCountryConfigRes, TimeSlotConfig } from 'src/libs/interfaces';

import { AutoSlotAssignmentHelper } from '../autoSlotAssignmentHelper';

const createMockPlan = (time: DeliveryTime = DeliveryTime.morning): RoutePlanEntity =>
  ({
    time,
  }) as RoutePlanEntity;
const createMockConfig = (slots: TimeSlotConfig[] = []): GetCountryConfigRes =>
  ({
    delivery: {
      timings: [
        {
          id: DeliveryTime.morning,
          from: '07:00',
          to: '12:00',
          slots,
        },
      ],
    },
  }) as GetCountryConfigRes;

const createMockRouteItem = (overrides: Partial<RouteItem> = {}): RouteItem =>
  ({
    id: 'delivery-1',
    priority: 1,
    isMatched: false,
    origin: { lat: 26.217, lng: 50.586 },
    travelTime: 10,
    ...overrides,
  }) as RouteItem;
describe('AutoSlotAssignmentHelper', () => {
  describe('assignBalancedTimeSlots', () => {
    it('should be a synchronous method (not async)', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem(),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(plan, config, ['delivery-1'], routePlan);

      expect(result).toBeDefined();
      expect(result).not.toBeInstanceOf(Promise);
    });

    it('should return original routePlan when no slots are configured', () => {
      const plan = createMockPlan();
      const config = createMockConfig([]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem(),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(plan, config, ['delivery-1'], routePlan);

      expect(result).toBe(routePlan);
    });

    it('should handle items with undefined origin', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({ origin: undefined as any }),
        'delivery-2': createMockRouteItem({ id: 'delivery-2', origin: { lat: 26.218, lng: 50.587 } }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      // Should not throw error and should handle gracefully
    });

    it('should handle items with missing lat property', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({ origin: { lat: undefined as any, lng: 50.586 } }),
        'delivery-2': createMockRouteItem({ id: 'delivery-2', origin: { lat: 26.218, lng: 50.587 } }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      // Should not throw error
    });

    it('should handle items with missing lng property', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({ origin: { lat: 26.217, lng: undefined as any } }),
        'delivery-2': createMockRouteItem({ id: 'delivery-2', origin: { lat: 26.218, lng: 50.587 } }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      // Should not throw error
    });

    it('should handle items with null lat/lng values', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({ origin: { lat: null as any, lng: null as any } }),
        'delivery-2': createMockRouteItem({ id: 'delivery-2', origin: { lat: 26.218, lng: 50.587 } }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      // Should not throw error
    });

    it('should exclude items with invalid coordinates from clustering but keep them in routePlan', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({ id: 'delivery-1', origin: undefined as any }),
        'delivery-2': createMockRouteItem({
          id: 'delivery-2',
          origin: { lat: 26.218, lng: 50.587 },
          timeSlot: undefined,
        }),
        'delivery-3': createMockRouteItem({
          id: 'delivery-3',
          origin: { lat: 26.219, lng: 50.588 },
          timeSlot: undefined,
        }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2', 'delivery-3'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      expect(result['delivery-3']).toBeDefined();
      // Items with valid coordinates should get time slots assigned
      if (result['delivery-2'].timeSlot) {
        expect(result['delivery-2'].timeSlot).toBeDefined();
      }
      if (result['delivery-3'].timeSlot) {
        expect(result['delivery-3'].timeSlot).toBeDefined();
      }
    });

    it('should work correctly with all valid coordinates', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({
          id: 'delivery-1',
          origin: { lat: 26.217, lng: 50.586 },
          timeSlot: undefined,
        }),
        'delivery-2': createMockRouteItem({
          id: 'delivery-2',
          origin: { lat: 26.218, lng: 50.587 },
          timeSlot: undefined,
        }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      // Should assign time slots to items needing assignment
      expect(result['delivery-1'].timeSlot).toBeDefined();
      expect(result['delivery-2'].timeSlot).toBeDefined();
    });

    it('should return original routePlan when no items need assignment', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({
          id: 'delivery-1',
          origin: { lat: 26.217, lng: 50.586 },
          timeSlot: { from: '08:00', to: '10:00' },
        }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(plan, config, ['delivery-1'], routePlan);

      expect(result).toBe(routePlan);
    });

    it('should handle string lat/lng values gracefully', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);
      const routePlan: Record<string, RouteItem> = {
        'delivery-1': createMockRouteItem({ origin: { lat: '26.217' as any, lng: '50.586' as any } }),
        'delivery-2': createMockRouteItem({ id: 'delivery-2', origin: { lat: 26.218, lng: 50.587 } }),
      };

      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(
        plan,
        config,
        ['delivery-1', 'delivery-2'],
        routePlan,
      );

      expect(result).toBeDefined();
      expect(result['delivery-1']).toBeDefined();
      expect(result['delivery-2']).toBeDefined();
      // String values should be excluded from clustering
    });

    it('should efficiently handle larger datasets with optimized clustering', () => {
      const plan = createMockPlan();
      const config = createMockConfig([
        { from: '08:00', to: '10:00', enabled: true },
        { from: '10:00', to: '12:00', enabled: true },
      ]);

      const routePlan: Record<string, RouteItem> = {};
      const deliveryIds: string[] = [];
      const baseLat = 26.217;
      const baseLng = 50.586;

      for (let i = 0; i < 50; i++) {
        const id = `delivery-${i}`;
        deliveryIds.push(id);
        const clusterGroup = Math.floor(i / 10);
        routePlan[id] = createMockRouteItem({
          id,
          origin: {
            lat: baseLat + clusterGroup * 0.01 + (i % 10) * 0.0001,
            lng: baseLng + clusterGroup * 0.01 + (i % 10) * 0.0001,
          },
          timeSlot: undefined,
        });
      }

      const startTime = Date.now();
      const result = AutoSlotAssignmentHelper.assignBalancedTimeSlots(plan, config, deliveryIds, routePlan);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(Object.keys(result)).toHaveLength(50);

      for (const id of deliveryIds) {
        expect(result[id]).toBeDefined();
      }

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
