import { DeliveryEntity } from '@calo-backend/entities/DDB';
import { DeliveryRepository } from '@calo-backend/repositories/DDB';
import { generateDelivery } from '@calo-backend/tests/generators/delivery';
import { ObsAlarm } from '@teamcalo/core';
import { getDummyLambdaContext } from 'tests/lambda-payload-generator';

import {
  AddressType,
  Brand,
  Country,
  Currency,
  DDeliveryStatus,
  DeliveryStatus,
  DeliveryTime,
  PaymentMethod,
} from '@calo/types';

import { handler } from '../../endpoint';

jest.mock('@calo-backend/sendMessage');
jest.mock('@calo-backend/middleware', () => ({
  withSecrets: () => ({ before: async () => {} }),
  withQS: jest.requireActual<typeof import('@calo-backend/middleware')>('@calo-backend/middleware').withQS,
}));

const requestContext = {
  authorizer: {
    claims: {
      'custom:uuid': 'driver-test-123',
      name: 'Test Driver',
    },
  },
};

const headers = { 'calo-country': 'BH' };

const mockDelivery = generateDelivery({
  sk: 'delivery-id-123',
  userId: 'user-id-456',
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
  name: 'Test Customer',
  phoneNumber: '+97312345678',
  day: '2025-01-07',
  status: DeliveryStatus.upcoming,
  pendingAmount: 0,
  currency: Currency.BHD,
  shortId: 'TEST01',
  brand: Brand.CALO,
  time: DeliveryTime.morning,
  country: Country.BH,
} as unknown as Partial<DeliveryEntity>);

describe('UpdateDelivery Endpoint', () => {
  const mockFindById = jest.fn();
  const mockUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(DeliveryRepository.prototype, 'findById').mockImplementation(mockFindById);
    jest.spyOn(DeliveryRepository.prototype, 'update').mockImplementation(mockUpdate);
    jest.spyOn(ObsAlarm, 'fire').mockResolvedValue(undefined as never);
  });

  it('should return 200 when updating delivery status', async () => {
    mockFindById.mockResolvedValueOnce(mockDelivery);
    mockUpdate.mockImplementationOnce(() => Promise.resolve());

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: mockDelivery.sk },
        body: JSON.stringify({ deliveryStatus: DDeliveryStatus.unableToDeliver }),
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number; body: string };

    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ id: mockDelivery.sk });
    expect(mockFindById).toHaveBeenCalledWith(mockDelivery.sk);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should return 200 and include deliveredAt when status is delivered', async () => {
    mockFindById.mockResolvedValueOnce(mockDelivery);
    mockUpdate.mockImplementationOnce(() => Promise.resolve());

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: mockDelivery.sk },
        body: JSON.stringify({ deliveryStatus: DDeliveryStatus.delivered }),
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number; body: string };

    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ id: mockDelivery.sk });
    expect(body.deliveredAt).toBeDefined();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should return 500 when the delivery repository throws an error', async () => {
    mockFindById.mockRejectedValueOnce(new Error('DynamoDB connection error'));

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: mockDelivery.sk },
        body: JSON.stringify({ deliveryStatus: DDeliveryStatus.unableToDeliver }),
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(500);
  });
});
