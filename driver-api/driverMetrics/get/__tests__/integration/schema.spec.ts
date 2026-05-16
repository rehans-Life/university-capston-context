import { DeliveryTime } from '@calo-backend/enums';

import { eventRequestSchema, eventResponseSchema } from '../../schema';

const validRouteItem = {
  id: 'delivery-id-1',
  priority: 1,
  isMatched: true,
  origin: { lat: 26.2, lng: 50.5 },
  travelTime: 300,
  toBeDeliveredAt: '2025-01-07T09:00:00.000Z',
};

const validResponseBody = {
  id: 'route-plan-123',
  day: '2025-01-07',
  time: DeliveryTime.morning,
  canStartShift: false,
  kitchenPosition: { lat: 26.217, lng: 50.586 },
  startShiftTime: '07:00',
  routePlan: {},
  driver: {
    driverName: 'Test Driver',
    id: 'driver-id-1',
    phoneNumber: '+97312345678',
    email: 'driver@calo.app',
  },
  allowPhotographicNotes: true,
};

describe('GetDriverMetrics Schema', () => {
  describe('eventRequestSchema', () => {
    it('should pass for each valid DeliveryTime value', () => {
      for (const time of Object.values(DeliveryTime)) {
        const result = eventRequestSchema.safeParse({ pathParameters: { time } });
        expect(result.success).toBe(true);
      }
    });

    it('should fail when time is an invalid value', () => {
      const result = eventRequestSchema.safeParse({
        pathParameters: { time: 'afternoon' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('time is required');
    });

    it('should fail when time is missing', () => {
      const result = eventRequestSchema.safeParse({
        pathParameters: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('time is required');
    });

    it('should fail when pathParameters is missing', () => {
      const result = eventRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('eventResponseSchema', () => {
    it('should pass for a valid response with empty routePlan', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: validResponseBody,
      });

      expect(result.success).toBe(true);
    });

    it('should pass when body is undefined (no route plan)', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: undefined,
      });

      expect(result.success).toBe(true);
    });

    it('should pass when body is null', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: null,
      });

      expect(result.success).toBe(true);
    });

    it('should pass when routePlan contains valid route items', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: {
          ...validResponseBody,
          routePlan: { 'delivery-id-1': validRouteItem },
          totalDeliveries: 1,
          deliveredDeliveries: 0,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should pass when optional fields are included', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: {
          ...validResponseBody,
          totalDeliveries: 5,
          deliveredDeliveries: 3,
          startingPosition: { lat: 26.2, lng: 50.5 },
          driverActions: [{ type: 'startShift', time: '2025-01-07T07:00:00.000Z' }],
        },
      });

      expect(result.success).toBe(true);
    });

    it('should pass with extra unknown fields (looseObject)', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: { ...validResponseBody, extraField: 'ignored' },
      });

      expect(result.success).toBe(true);
    });

    it('should pass with route item actions', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: {
          ...validResponseBody,
          routePlan: {
            'delivery-id-1': {
              ...validRouteItem,
              actions: [{ createdAt: '2025-01-07T09:05:00.000Z', type: 'CUSTOMERS_NOT_ANSWERING' }],
            },
          },
        },
      });

      expect(result.success).toBe(true);
    });

    it('should fail when statusCode is not 200', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 500,
        body: validResponseBody,
      });

      expect(result.success).toBe(false);
    });

    it('should fail when a required body field is missing', () => {
      const { driver: _driver, ...bodyWithoutDriver } = validResponseBody;

      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: bodyWithoutDriver,
      });

      expect(result.success).toBe(false);
    });

    it('should fail when time is not a valid DeliveryTime', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: { ...validResponseBody, time: 'afternoon' },
      });

      expect(result.success).toBe(false);
    });

    it('should fail when canStartShift is not a boolean', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: { ...validResponseBody, canStartShift: 'yes' },
      });

      expect(result.success).toBe(false);
    });

    it('should fail when a route item is missing required fields', () => {
      const { isMatched: _isMatched, ...incompleteRouteItem } = validRouteItem;

      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: {
          ...validResponseBody,
          routePlan: { 'delivery-id-1': incompleteRouteItem },
        },
      });

      expect(result.success).toBe(false);
    });
  });
});
