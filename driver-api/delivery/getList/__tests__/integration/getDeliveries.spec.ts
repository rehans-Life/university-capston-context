import { randomUUID } from 'crypto';

import { DataType, DeliveryTime } from '@calo-backend/enums';
import { makeDelivery } from '@calo-backend/factories/DDB';
import { DeliveryRepository, SubscriptionRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { format } from 'date-fns/fp';
import { generateSubscription } from 'tests/generators/subscription';

import { Country, Kitchen } from '@calo/types';

import GetDeliveryListUseCase from '../../useCase';
import { GetDeliveriesReq } from '@libs/interfaces';
import { DeliveryEstimationRepository } from '@libs/repositories/DDB';

let deliveryRepository: DeliveryRepository;
let esDeliveryRepository: EsDeliveryRepository;
let subscriptionRepository: SubscriptionRepository;
let routePlanRepository: RoutePlanRepository;
let deliveryEstimationRepository: DeliveryEstimationRepository;

let deliveryListUseCase: GetDeliveryListUseCase;

let userId;
let deliveryId;

beforeAll(() => {
  deliveryRepository = new DeliveryRepository();
  subscriptionRepository = new SubscriptionRepository();
  deliveryEstimationRepository = new DeliveryEstimationRepository();
  routePlanRepository = new RoutePlanRepository();
  esDeliveryRepository = new EsDeliveryRepository();

  deliveryListUseCase = new GetDeliveryListUseCase(
    esDeliveryRepository,
    deliveryRepository,
    subscriptionRepository,
    deliveryEstimationRepository,
    routePlanRepository,
  );

  userId = randomUUID();
  deliveryId = randomUUID();
});

afterAll(async () => {
  await deliveryRepository.delete({ ids: [deliveryId], userId });
});

describe('GetDeliveryListUseCase Integration Tests', () => {
  it('should return correct deliveries and additionalData for valid input (happy path)', async () => {
    // Arrange
    const subData = generateSubscription({ userId });
    const subscription = await subscriptionRepository.create(subData);

    const driver = {
      id: 'driver123',
      name: 'Michael Jackson',
    };

    const today = format('yyyy-MM-dd')(new Date());

    const delivery1 = makeDelivery(subscription, today, Kitchen.BH1, deliveryId);

    await deliveryRepository.create(delivery1);

    //sudo allows setting driver on update only
    delivery1.set({
      driver,
    });
    await deliveryRepository.update(delivery1);

    const getDeliveriesReq: GetDeliveriesReq = {
      day: today,
      time: DeliveryTime.morning,
    };

    // Act
    const result = await deliveryListUseCase.exec(driver.id, getDeliveriesReq, Country.BH, Kitchen.BH1);

    // Assert
    await expect({
      region: process.env.AWS_REGION,
      table: process.env.DATA_TABLE_NAME,
    }).toHaveItem({
      id: `${DataType.delivery}#${userId}`,
      sk: deliveryId,
    });

    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries.map((d) => d.id)).toContain(delivery1.id);
  });
});
