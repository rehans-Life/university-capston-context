import { DeliveryEntity } from '@calo-backend/entities/DDB';
import { DeliveryRepository } from '@calo-backend/repositories/DDB';
import { generateDelivery } from '@calo-backend/tests/generators/delivery';
import { ObsAlarm } from '@teamcalo/core';
import { getDummyLambdaContext } from 'tests/lambda-payload-generator';

import { AddressType, Brand, Country, Currency, DeliveryStatus, PaymentMethod } from '@calo/types';

import { handler } from '../../endpoint';

const requestContext = {
  authorizer: {
    claims: { 'custom:uuid': 'driver-test-123' },
  },
};

const headers = { 'calo-country': 'BH' };

describe('Get Delivery', () => {
  const mockFindById = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(DeliveryRepository.prototype, 'findById').mockImplementation(mockFindById);
    jest.spyOn(ObsAlarm, 'fire').mockResolvedValue(undefined as never);
  });

  it('should return 200 with the delivery for a valid id (happy path)', async () => {
    const deliveryId = 'mock-delivery-id-123';
    const userId = 'mock-user-id-456';

    const mockDelivery = generateDelivery({
      sk: deliveryId,
      userId,
      paymentMethod: PaymentMethod.cc,
      deliveryAddress: {
        id: 'addr-1',
        lat: 26.228_516,
        lng: 50.586_048,
        country: Country.BH,
        name: 'Test Address',
        type: AddressType.home,
        default: true,
        street: 'Avenue 47',
        building: '4',
      },
      name: 'Test Driver',
      phoneNumber: '+97312345678',
      day: '2025-01-07',
      status: DeliveryStatus.upcoming,
      pendingAmount: 0,
      currency: Currency.BHD,
      shortId: 'TEST01',
      brand: Brand.CALO,
    } as unknown as Partial<DeliveryEntity>);

    mockFindById.mockResolvedValueOnce(mockDelivery);

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: deliveryId },
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number; body: string };

    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      sk: deliveryId,
      userId,
    });
    expect(mockFindById).toHaveBeenCalledWith(deliveryId);
  });

  it('should return 500 when the repository throws an error', async () => {
    mockFindById.mockRejectedValueOnce(new Error('DynamoDB connection error'));

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: 'some-delivery-id' },
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(500);
    expect(mockFindById).toHaveBeenCalledWith('some-delivery-id');
  });
});
