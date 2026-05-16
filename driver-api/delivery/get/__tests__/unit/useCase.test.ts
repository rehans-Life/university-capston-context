import { DeliveryRepository } from '@calo-backend/repositories/DDB';

import { deliveryEntity } from '../../../../libs/mockData/data';
import UseCase from '../../useCase';

const deliveryRepository = new DeliveryRepository();

describe('should return deliveries list', () => {
  test('test delivery get list use case', async () => {
    const spy1 = jest.spyOn(deliveryRepository, 'findById').mockImplementation(() => Promise.resolve(deliveryEntity));

    const useCase = new UseCase(deliveryRepository);
    const res = await useCase.exec('123');

    expect(spy1).toBeCalled();

    expect(res).toEqual(deliveryEntity);
    spy1.mockRestore();
  });
});
