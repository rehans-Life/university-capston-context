import { randomUUID } from 'crypto';

import { DataType, DeliveryTime } from '@calo-backend/enums';
import { Context, Callback, SQSEvent } from 'aws-lambda';
import DeliveryEstimationManager from 'tests/utils/test-delivery-estimation-manager';

import { handler as lambdaHandler } from '../../endpoint';
import { DeliveryEstimationRepository } from '@libs/repositories/DDB';

let deliveryEstimationManager: DeliveryEstimationManager;
const context: Context = {} as Context;
const callback: Callback = () => {};

beforeAll(async () => {
  const deliveryEstimationRepository = new DeliveryEstimationRepository();
  deliveryEstimationManager = new DeliveryEstimationManager(deliveryEstimationRepository);
});

describe('SyncETA SQS Listener', () => {
  test('should create a deliveryEstimation if one does not exist for user', async () => {
    const routeId = randomUUID();
    const userId = randomUUID();
    const preferredRouteObject = {
      preferredRoute: [
        {
          id: routeId,
          userId: userId,
          priority: 1,
          groupBufferTime: 15,
          origin: {
            lat: 40.7128,
            lng: -74.006,
          },
          deliveryTime: '2025-01-07T08:00:00.000Z',
        },
      ],
      day: '2025-01-07',
      deliveryTime: DeliveryTime.morning,
    };

    const sqsEvent = {
      Records: [
        {
          body: JSON.stringify(preferredRouteObject),
        },
      ],
    };

    try {
      await lambdaHandler(sqsEvent as SQSEvent, context, callback);

      await expect({
        region: process.env.AWS_REGION,
        table: process.env.DATA_TABLE_NAME!,
      }).toHaveItem({
        id: `${DataType.deliveryEta}`,
        sk: `${userId}`,
      });
    } finally {
      await deliveryEstimationManager.deleteEstimation(userId);
    }
  });

  test('should append a new ETA to the existing list when `day` and `deliveryTime` match', async () => {
    const userId = randomUUID();

    // Seed data with an existing ETA
    await deliveryEstimationManager.seedEstimation({
      sk: userId,
      etas: [
        {
          day: '2025-01-07',
          deliveryTime: DeliveryTime.morning,
          priority: 1,
          ETAs: [
            {
              createdAt: '2025-01-07T19:30:16.570Z',
              time: '2025-01-07T08:00:00.000Z',
            },
          ],
        },
      ],
    });

    const routeId = randomUUID();
    const preferredRouteObject = {
      preferredRoute: [
        {
          id: routeId,
          userId: userId,
          priority: 2,
          deliveryTime: '2025-01-07T09:00:00.000Z',
        },
      ],
      day: '2025-01-07',
      deliveryTime: DeliveryTime.morning,
    };

    const sqsEvent = {
      Records: [
        {
          body: JSON.stringify(preferredRouteObject),
        },
      ],
    };

    try {
      await lambdaHandler(sqsEvent as SQSEvent, context, callback);

      const updatedItem = await deliveryEstimationManager.getEstimation(userId);
      expect(updatedItem!.etas![0].ETAs).toHaveLength(2);
    } finally {
      await deliveryEstimationManager.deleteEstimation(userId);
    }
  });

  test('should create a new ETA entry in the estimation when `day` or `deliveryTime` do not match', async () => {
    const userId = randomUUID();

    // Seed data with an existing ETA
    await deliveryEstimationManager.seedEstimation({
      sk: userId,
      etas: [
        {
          day: '2025-01-06',
          deliveryTime: DeliveryTime.morning,
          priority: 1,
          ETAs: [
            {
              createdAt: '2025-01-06T19:30:16.570Z',
              time: '2025-01-06T08:00:00.000Z',
            },
          ],
        },
      ],
    });

    const routeId = randomUUID();
    const preferredRouteObject = {
      preferredRoute: [
        {
          id: routeId,
          userId: userId,
          priority: 2,
          deliveryTime: '2025-01-07T08:00:00.000Z',
        },
      ],
      day: '2025-01-07',
      deliveryTime: DeliveryTime.evening,
    };

    const sqsEvent = {
      Records: [
        {
          body: JSON.stringify(preferredRouteObject),
        },
      ],
    };

    try {
      await lambdaHandler(sqsEvent as SQSEvent, context, callback);

      const updatedItem = await deliveryEstimationManager.getEstimation(userId);
      expect(updatedItem?.etas).toHaveLength(2);
    } finally {
      await deliveryEstimationManager.deleteEstimation(userId);
    }
  });
});
