import { eventRequestSchema, eventResponseSchema } from '../../schema';

const validDeliveryBody = {
  id: 'delivery#user-id-123',
  userId: 'user-id-123',
  paymentMethod: 'cc',
  deliveryAddress: { id: 'addr-1', lat: 26.2, lng: 50.5 },
  name: 'Test Customer',
  phoneNumber: '+97312345678',
  day: '2025-01-07',
  status: 'upcoming',
  pendingAmount: 0,
  currency: 'BHD',
  shortId: 'TEST01',
  brand: 'CALO',
};

describe('GetDelivery Schema', () => {
  describe('eventRequestSchema', () => {
    it('should pass for a valid id path parameter', () => {
      const result = eventRequestSchema.safeParse({
        pathParameters: { id: 'delivery-id-123' },
      });

      expect(result.success).toBe(true);
    });

    it('should fail when id is missing', () => {
      const result = eventRequestSchema.safeParse({
        pathParameters: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('id is required');
    });

    it('should fail when id is an empty string', () => {
      const result = eventRequestSchema.safeParse({
        pathParameters: { id: '' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('id cannot be empty');
    });

    it('should fail when pathParameters is missing', () => {
      const result = eventRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe('eventResponseSchema', () => {
    it('should pass for a valid response with all required fields', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: validDeliveryBody,
      });

      expect(result.success).toBe(true);
    });

    it('should pass when optional fields are included', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: {
          ...validDeliveryBody,
          time: 'morning',
          deliveryStatus: 'delivered',
          deliveredAt: '2025-01-07T10:00:00.000Z',
          priority: 1,
          groupBufferTime: 5,
          withCoolerBag: true,
          unreturnedCoolerBags: 0,
          coolerBagsReturned: 1,
          eta: { estimatedAt: '2025-01-07T10:00:00.000Z' },
        },
      });

      expect(result.success).toBe(true);
    });

    it('should pass with extra unknown fields (looseObject)', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: {
          ...validDeliveryBody,
          someExtraField: 'extra-value',
          anotherField: 42,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should fail when statusCode is not 200', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 201,
        body: validDeliveryBody,
      });

      expect(result.success).toBe(false);
    });

    it('should fail when a required body field is missing', () => {
      const { paymentMethod: _paymentMethod, ...bodyWithoutPaymentMethod } = validDeliveryBody;

      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: bodyWithoutPaymentMethod,
      });

      expect(result.success).toBe(false);
    });

    it('should fail when pendingAmount is not a number', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: { ...validDeliveryBody, pendingAmount: 'zero' },
      });

      expect(result.success).toBe(false);
    });

    it('should fail when body is null', () => {
      const result = eventResponseSchema.safeParse({
        statusCode: 200,
        body: null,
      });

      expect(result.success).toBe(false);
    });
  });
});
