import { DataType } from '@calo-backend/enums';
import { DeliveryRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { refactoredForDriver, routePlanEntity, updateReq } from 'src/__mocks__/mock';
import { LocationRepository } from 'src/libs/repositories/API';

import GetDriverMetricsUseCase from '../../updateUseCase';

jest.mock('@calo-backend/fireEvent');

describe('test update driverMetrics use case', () => {
  test('should update and return updated driverMetrics', async () => {
    const routePlanRepository = new RoutePlanRepository();
    const locationRepository = new LocationRepository('123');
    const deliveryRepository = new DeliveryRepository();

    const spy = jest.spyOn(routePlanRepository, 'find').mockImplementation(() => Promise.resolve(routePlanEntity));
    const spy1 = jest.spyOn(routePlanRepository, 'update').mockImplementation(() => Promise.resolve());
    const get = new GetDriverMetricsUseCase(routePlanRepository, locationRepository, deliveryRepository);

    const res = await get.exec('123', updateReq);
    routePlanEntity.set(updateReq);
    refactoredForDriver.canStartShift = true;
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ id: DataType.routePlanNew, sk: '123' });
    expect(spy1).toHaveBeenCalled();
    expect(spy1).toHaveBeenCalledWith(routePlanEntity);
    expect(res).toEqual({
      driverMetrics: refactoredForDriver,
      eta: undefined,
    });
    spy.mockRestore();
    spy1.mockRestore();
  });
});
