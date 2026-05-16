import { DeliveryRepository, RoutePlanRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';

import { routePlanEntity } from '../../../../__mocks__/mock';
import { deliveryEntity, subscriptionEntity } from '../../../../libs/mockData/data';
import UseCase from '../../useCase';

const deliveryRepository = new DeliveryRepository();
const routePlanRepository = new RoutePlanRepository();
const subscriptionRepository = new SubscriptionRepository();

jest.mock('@calo-backend/fireEvent');
describe('test no customer at delivery spot use case', () => {
  test('test no customer at delivery spot use case', async () => {
    const spy1 = jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(deliveryEntity);
    const spy2 = jest.spyOn(routePlanRepository, 'getByDayIdTime').mockResolvedValue(routePlanEntity);
    const spy3 = jest.spyOn(routePlanRepository, 'update').mockResolvedValue();
    const spy4 = jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(subscriptionEntity);

    const useCase = new UseCase(deliveryRepository, routePlanRepository, subscriptionRepository);
    const res = await useCase.exec('123', '123', 'test', 'test', []);

    expect(spy1).toBeCalled();
    expect(spy1).toBeCalledWith('123');
    expect(spy2).toBeCalled();

    expect(res).toEqual(null);
    spy1.mockRestore();
    spy2.mockRestore();
    spy3.mockRestore();
    spy4.mockRestore();
  });
});
