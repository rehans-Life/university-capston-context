import { DeliveryRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';

import { deliveryEntity } from '../../../../libs/mockData/data';
import UseCase from '../../useCase';
import { req } from '../req';

const deliveryRepository = new DeliveryRepository();
const esDeliveryRepository = new EsDeliveryRepository();
const subscriptionRepository = new SubscriptionRepository();

jest.mock('@calo-backend/sendMessage');

describe('test delivery update use case', () => {
  test('update delivery', async () => {
    const spy1 = jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(deliveryEntity);
    const spy3 = jest.spyOn(deliveryEntity, 'set').mockImplementation(() => {});
    const spy4 = jest.spyOn(deliveryRepository, 'update').mockResolvedValue(undefined as any);

    const useCase = new UseCase(deliveryRepository, esDeliveryRepository, subscriptionRepository);
    const res = await useCase.exec('123', req, '123', 'test');
    expect(spy1).toHaveBeenCalled();
    expect(spy1).toHaveBeenCalledWith('123');

    expect(spy3).toHaveBeenCalled();

    expect(res).toEqual(deliveryEntity);
    spy1.mockRestore();
    spy3.mockRestore();
    spy4.mockRestore();
  });
});
