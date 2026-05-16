import { DeliveryRepository } from '@calo-backend/repositories/DDB';

import { deliveryEntity } from '../../../../libs/mockData/data';
import UseCase from '../../useCase';

const deliveryRepository = new DeliveryRepository();
jest.mock('@calo-backend/fireEvent');
describe('test unable to deliver use case', () => {
  test('test unable to deliver delivery use case', async () => {
    const spy1 = jest.spyOn(deliveryRepository, 'findById').mockImplementation(() => Promise.resolve(deliveryEntity));

    const useCase = new UseCase(deliveryRepository);
    const res = await useCase.exec('123', '123', 'test');

    expect(spy1).toBeCalled();
    expect(spy1).toBeCalledWith('123');

    expect(res).toEqual(null);
    spy1.mockRestore();
  });
});
