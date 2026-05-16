import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as ESDeliveryRepository } from '@calo-backend/repositories/ES';
import { subDays, format } from 'date-fns/fp';

import { DeliveryTime } from '@calo/types';

import { req } from './req';
import { routePlanEntity } from '../../../../__mocks__/mock';
import { deliveryEntity, subscriptionEntity } from '../../../../libs/mockData/data';
import UseCase from '../useCase';

const routePlanRepository = new RoutePlanRepository();
const subscriptionRepository = new SubscriptionRepository();
const deliveryRepository = new DeliveryRepository();
const eSDeliveryRepository = new ESDeliveryRepository();

describe('test use case', () => {
  test('handle update delivery status', async () => {
    const spy1 = jest.spyOn(routePlanRepository, 'getByDayIdTime').mockResolvedValue(routePlanEntity);
    const spy2 = jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(subscriptionEntity);
    const spy5 = jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(deliveryEntity);

    const spy3 = jest.spyOn(subscriptionRepository, 'update').mockResolvedValue();
    const spy4 = jest.spyOn(routePlanRepository, 'update').mockResolvedValue();

    const spy6 = jest.spyOn(eSDeliveryRepository, 'getLastFourDeliveries').mockResolvedValue({ data: [], total: 0 });

    const useCase = new UseCase(routePlanRepository, subscriptionRepository, deliveryRepository, eSDeliveryRepository);
    const res = await useCase.exec(req);
    const deliveryDay =
      deliveryEntity.time === DeliveryTime.evening
        ? format('yyyy-MM-dd')(subDays(1)(new Date(deliveryEntity.day)))
        : deliveryEntity.day;

    expect(spy1).toBeCalled();
    expect(spy1).toBeCalledWith(deliveryDay, '123', deliveryEntity.time);

    // const startDate = format('yyyy-MM-dd')(subWeeks(3)(new Date(deliveryEntity.day)));
    expect(spy2).toBeCalled();
    expect(spy5).toBeCalled();
    expect(spy3).toBeCalledWith(subscriptionEntity);

    expect(res).toEqual(undefined);
    spy1.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
    spy4.mockRestore();
    spy5.mockRestore();
    spy6.mockRestore();
  });
});
