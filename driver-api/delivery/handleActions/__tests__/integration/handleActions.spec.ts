import { RouteItemActionType } from '@calo-backend/enums';
import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { ObsAlarm } from '@teamcalo/core';
import { getDummyLambdaContext } from 'tests/lambda-payload-generator';

import { routePlanEntity } from '../../../../__mocks__/mock';
import { deliveryEntity, subscriptionEntity } from '../../../../libs/mockData/data';
import { handler } from '../../endpoint';

jest.mock('@calo-backend/fireEvent');
jest.mock('@calo-backend/publishEvent');

const requestContext = {
  authorizer: {
    claims: {
      'custom:uuid': 'driver-test-123',
      phone_number: '+97312345678',
      name: 'Test Driver',
    },
  },
};

const headers = { 'calo-country': 'BH' };

describe('HandleActions Endpoint', () => {
  const mockFindDelivery = jest.fn();
  const mockGetByDayIdTime = jest.fn();
  const mockUpdatePlan = jest.fn();
  const mockFindSubscription = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(DeliveryRepository.prototype, 'findById').mockImplementation(mockFindDelivery);
    jest.spyOn(RoutePlanRepository.prototype, 'getByDayIdTime').mockImplementation(mockGetByDayIdTime);
    jest.spyOn(RoutePlanRepository.prototype, 'update').mockImplementation(mockUpdatePlan);
    jest.spyOn(SubscriptionRepository.prototype, 'findById').mockImplementation(mockFindSubscription);
    jest.spyOn(ObsAlarm, 'fire').mockResolvedValue(undefined as never);
  });

  it('should return 200 when actions are handled successfully', async () => {
    mockFindDelivery.mockResolvedValueOnce(deliveryEntity);
    mockGetByDayIdTime.mockResolvedValueOnce(routePlanEntity);
    mockUpdatePlan.mockImplementationOnce(() => Promise.resolve());
    mockFindSubscription.mockResolvedValueOnce(subscriptionEntity);

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: deliveryEntity.sk },
        // @ts-ignore
        body: JSON.stringify({ actions: [{ type: RouteItemActionType.CUSTOMERS_REQUESTING_A_CALL_FROM_CX }] }),
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(200);
    expect(mockFindDelivery).toHaveBeenCalledWith(deliveryEntity.sk);
  });

  it('should return 200 when no route plan exists for the delivery', async () => {
    mockFindDelivery.mockResolvedValueOnce(deliveryEntity);
    mockGetByDayIdTime.mockResolvedValueOnce(null);

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: deliveryEntity.sk },
        // @ts-ignore
        body: JSON.stringify({ actions: [{ type: RouteItemActionType.CUSTOMERS_REQUESTING_A_CALL_FROM_CX }] }),
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(200);
    expect(mockUpdatePlan).not.toHaveBeenCalled();
  });

  it('should return 500 when the delivery repository throws an error', async () => {
    mockFindDelivery.mockRejectedValueOnce(new Error('DynamoDB connection error'));

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { id: 'some-delivery-id' },
        // @ts-ignore
        body: JSON.stringify({ actions: [{ type: RouteItemActionType.CUSTOMERS_REQUESTING_A_CALL_FROM_CX }] }),
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(500);
  });
});
