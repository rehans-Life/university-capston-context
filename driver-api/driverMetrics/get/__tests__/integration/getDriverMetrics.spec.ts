import { DeliveryTime } from '@calo-backend/enums';
import { RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { ObsAlarm } from '@teamcalo/core';
import { getDummyLambdaContext } from 'tests/lambda-payload-generator';

import { Country } from '@calo/types';

import { routePlanEntity } from '../../../../__mocks__/mock';
import { handler } from '../../endpoint';

const requestContext = {
  authorizer: {
    claims: {
      'custom:uuid': 'driver-test-123',
      'custom:country': Country.BH,
    },
  },
};

const headers = { 'calo-country': 'BH' };

describe('GetDriverMetrics Endpoint', () => {
  const mockGetByDayIdTime = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(RoutePlanRepository.prototype, 'getByDayIdTime').mockImplementation(mockGetByDayIdTime);
    jest.spyOn(ObsAlarm, 'fire').mockResolvedValue(undefined as never);
  });

  it('should return 200 with driver metrics when a route plan exists', async () => {
    mockGetByDayIdTime.mockResolvedValueOnce(routePlanEntity);

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { time: DeliveryTime.morning },
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number; body: string };

    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      id: routePlanEntity.sk,
      day: routePlanEntity.day,
      time: DeliveryTime.morning,
    });
    expect(mockGetByDayIdTime).toHaveBeenCalledWith(expect.any(String), 'driver-test-123', DeliveryTime.morning);
  });

  it('should return 200 with empty body when no route plan exists', async () => {
    mockGetByDayIdTime.mockResolvedValueOnce(null);

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { time: DeliveryTime.morning },
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(200);
    expect(mockGetByDayIdTime).toHaveBeenCalled();
  });

  it('should return 500 when the repository throws an error', async () => {
    mockGetByDayIdTime.mockRejectedValueOnce(new Error('DynamoDB connection error'));

    const response = (await handler(
      {
        // @ts-ignore
        requestContext,
        pathParameters: { time: DeliveryTime.morning },
        headers,
      },
      getDummyLambdaContext(),
      null,
    )) as { statusCode: number };

    expect(response.statusCode).toBe(500);
  });
});
