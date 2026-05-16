import { DeliveryEntity } from '@calo-backend/entities/DDB';
import { DeliveryRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { generateDelivery } from '@calo-backend/tests/generators/delivery';
import { ObsAlarm } from '@teamcalo/core';

import {
  AddressType,
  Brand,
  Country,
  Currency,
  DDeliveryStatus,
  DeliveryStatus,
  DeliveryTime,
  PaymentMethod,
} from '@calo/types';

import UseCase from '../../useCase';

jest.mock('@calo-backend/sendMessage');
jest.mock('@calo-backend/fireEvent');

const makeDelivery = () =>
  generateDelivery({
    sk: 'delivery-id-123',
    userId: 'user-id-456',
    paymentMethod: PaymentMethod.cc,
    deliveryAddress: {
      id: 'addr-1',
      lat: 26.228_516,
      lng: 50.586_048,
      country: Country.BH,
      name: 'Test Address',
      type: AddressType.home,
      default: true,
      street: 'Avenue 47',
      building: '4',
    },
    name: 'Test Customer',
    phoneNumber: '+97312345678',
    day: '2025-01-07',
    status: DeliveryStatus.upcoming,
    pendingAmount: 0,
    currency: Currency.BHD,
    shortId: 'TEST01',
    brand: Brand.CALO,
    time: DeliveryTime.morning,
    country: Country.BH,
  } as unknown as Partial<DeliveryEntity>);

describe('UpdateDeliveryUseCase', () => {
  const mockFindById = jest.fn();
  const mockUpdate = jest.fn();

  const deliveryRepository = new DeliveryRepository();
  const esDeliveryRepository = new EsDeliveryRepository();
  const subscriptionRepository = new SubscriptionRepository();

  const useCase = new UseCase(deliveryRepository, esDeliveryRepository, subscriptionRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(DeliveryRepository.prototype, 'findById').mockImplementation(mockFindById);
    jest.spyOn(DeliveryRepository.prototype, 'update').mockImplementation(mockUpdate);
    jest.spyOn(ObsAlarm, 'fire').mockResolvedValue(undefined as never);
    mockUpdate.mockImplementation(() => Promise.resolve());
  });

  it('should update delivery status and return updated entity', async () => {
    const delivery = makeDelivery();
    mockFindById.mockResolvedValueOnce(delivery);

    const result = await useCase.exec(
      'delivery-id-123',
      { deliveryStatus: DDeliveryStatus.unableToDeliver },
      'driver-id',
      'Driver Name',
    );

    expect(mockFindById).toHaveBeenCalledWith('delivery-id-123');
    expect(mockUpdate).toHaveBeenCalled();
    expect(result.deliveryStatus).toBe(DDeliveryStatus.unableToDeliver);
    expect(result.coolerBagsReturned).toBe(0);
  });

  it('should set deliveredAt and call sendMessage when status is delivered', async () => {
    const sendMessage = jest.requireMock<{ default: jest.Mock }>('@calo-backend/sendMessage').default;
    const delivery = makeDelivery();
    mockFindById.mockResolvedValueOnce(delivery);

    const result = await useCase.exec(
      'delivery-id-123',
      { deliveryStatus: DDeliveryStatus.delivered },
      'driver-id',
      'Driver Name',
    );

    expect(result.deliveryStatus).toBe(DDeliveryStatus.delivered);
    expect(result.deliveredAt).toBeDefined();
    expect(result.driver).toMatchObject({ id: 'driver-id', name: 'Driver Name' });
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'delivery-id-123',
        driverId: 'driver-id',
      }),
      expect.any(Object),
    );
  });

  it('should not call update when no fields change', async () => {
    const delivery = makeDelivery();
    mockFindById.mockResolvedValueOnce(delivery);

    await useCase.exec('delivery-id-123', {}, 'driver-id', 'Driver Name');

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should throw when the repository throws an error', async () => {
    mockFindById.mockRejectedValueOnce(new Error('DynamoDB error'));

    await expect(
      useCase.exec('delivery-id-123', { deliveryStatus: DDeliveryStatus.unableToDeliver }, 'driver-id', 'Driver Name'),
    ).rejects.toThrow('DynamoDB error');
  });
});
