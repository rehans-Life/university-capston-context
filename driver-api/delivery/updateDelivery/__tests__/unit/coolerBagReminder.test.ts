import { DeliveryEntity } from '@calo-backend/entities/DDB';
import fireEvent from '@calo-backend/fireEvent';
import { DeliveryRepository, SubscriptionRepository } from '@calo-backend/repositories/DDB';
import { DeliveryRepository as EsDeliveryRepository } from '@calo-backend/repositories/ES';
import { ObsAlarm } from '@teamcalo/core';

import { Country, DDeliveryStatus } from '@calo/types';

import sendSlackMessage from '../../../../sendSlackMessage/sendSlackMessage';
import * as helper from '../../../helper';
import UseCase from '../../useCase';
import { req } from '../req';

jest.mock('@calo-backend/sendMessage');
jest.mock('@calo-backend/fireEvent');
jest.mock('../../../../sendSlackMessage/sendSlackMessage');
jest.mock('@calo/core', () => ({
  ...jest.requireActual('@calo/core'),
  ObsAlarm: {
    fire: jest.fn(),
  },
}));

const deliveryRepository = new DeliveryRepository();
const esDeliveryRepository = new EsDeliveryRepository();
const subscriptionRepository = new SubscriptionRepository();

const createMockDelivery = (overrides: Partial<any> = {}): DeliveryEntity =>
  ({
    userId: 'user-123',
    sk: 'delivery-123',
    country: Country.AE,
    name: 'Test User',
    day: '2023-12-01',
    time: 'morning',
    deliveryAddress: {
      lat: 25.2048,
      lng: 55.2708,
      country: Country.AE,
    },
    set: jest.fn(),
    getDirty: jest.fn().mockReturnValue({ deliveryStatus: DDeliveryStatus.delivered }),
    ...overrides,
  }) as unknown as DeliveryEntity;

describe('UpdateDeliveryUseCase - Cooler Bag Reminder Flow', () => {
  let useCase: UseCase;
  let fireEventMock: jest.MockedFunction<typeof fireEvent>;
  let obsAlarmFireMock: jest.MockedFunction<typeof ObsAlarm.fire>;
  let sendSlackMessageMock: jest.MockedFunction<typeof sendSlackMessage>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UseCase(deliveryRepository, esDeliveryRepository, subscriptionRepository);
    fireEventMock = fireEvent as jest.MockedFunction<typeof fireEvent>;
    obsAlarmFireMock = ObsAlarm.fire as jest.MockedFunction<typeof ObsAlarm.fire>;
    sendSlackMessageMock = sendSlackMessage as jest.MockedFunction<typeof sendSlackMessage>;

    // Mock subscriptionRepository globally for all tests
    jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue({ email: 'test@example.com' } as any);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('When cooler bag is not returned in AE', () => {
    it('should send intercom and push notification when bags still needed > 1', async () => {
      const aeDelivery = createMockDelivery({ name: 'John Doe' });

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 4, // Must be > threshold (3) to trigger notifications
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should send Intercom message
      expect(fireEventMock).toHaveBeenCalledWith(
        process.env.SEND_INTERCOM_ARN,
        expect.objectContaining({
          userId: aeDelivery.userId,
          message: expect.stringContaining('Hello there John Doe👋'),
        }),
      );

      expect(fireEventMock).toHaveBeenCalledWith(
        process.env.SEND_INTERCOM_ARN,
        expect.objectContaining({
          message: expect.stringContaining('return your Calo cooler bag'),
        }),
      );

      // Should send Push Notification
      expect(fireEventMock).toHaveBeenCalledWith(
        process.env.SEND_PUSH_NOTIFICATION_ARN,
        expect.objectContaining({
          userId: aeDelivery.userId,
          message: expect.stringContaining(`Hey ${aeDelivery.name}`),
        }),
      );

      expect(fireEventMock).toHaveBeenCalledWith(
        process.env.SEND_PUSH_NOTIFICATION_ARN,
        expect.objectContaining({
          message: expect.stringContaining("don't forget to return your cooler bag"),
        }),
      );

      // Should call fireEvent twice (once for Intercom, once for Push)
      expect(fireEventMock).toHaveBeenCalledTimes(2);
    });

    it('should NOT send notifications when bags still needed <= 1', async () => {
      const aeDelivery = createMockDelivery();

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 1,
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(fireEventMock).not.toHaveBeenCalled();
    });

    it('should NOT send notifications when bags still needed is 0', async () => {
      const aeDelivery = createMockDelivery();

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 0,
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(fireEventMock).not.toHaveBeenCalled();
    });
  });

  describe('When cooler bag reminder is not triggered', () => {
    it('should NOT send notifications when coolerBagNotReturned is false', async () => {
      const aeDelivery = createMockDelivery();

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: false,
          coolerBagsReturned: 1,
        },
        'driver-123',
        'Driver Name',
      );

      expect(fireEventMock).not.toHaveBeenCalled();
    });

    it('should NOT send notifications when country is not AE', async () => {
      const bhDelivery = createMockDelivery({ country: Country.BH });

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(bhDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(fireEventMock).not.toHaveBeenCalled();
    });

    it('should NOT send notifications for GB deliveries even when bags exceed threshold', async () => {
      const gbDelivery = createMockDelivery({ country: Country.GB });

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(gbDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [gbDelivery.userId]: {
          userId: gbDelivery.userId,
          bagsStillNeeded: 4, // > threshold (3), but GB should not trigger notifications
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(fireEventMock).not.toHaveBeenCalled();
      // Slack alerts should still fire for GB
      expect(sendSlackMessageMock).toHaveBeenCalled();
    });

    it('should NOT send notifications when delivery status is not delivered', async () => {
      const aeDelivery = createMockDelivery({
        getDirty: jest.fn().mockReturnValue({}),
      });

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      await useCase.exec(
        '123',
        {
          deliveryStatus: DDeliveryStatus.delivering,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(fireEventMock).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle intercom event failure gracefully and fire alarm', async () => {
      const aeDelivery = createMockDelivery();

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 4, // Must be > threshold to trigger notifications
        },
      });

      const intercomError = new Error('Intercom API failed');
      fireEventMock.mockRejectedValueOnce(intercomError);

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(obsAlarmFireMock).toHaveBeenCalledWith({
        name: 'UpdateDeliveryUseCase',
        description: 'failed to fire intercom event',
        error: intercomError,
        severity: 'ERROR',
      });
    });

    it('should handle getNumberOfCoolerBagsToBeReturned failure and fire alarm', async () => {
      const aeDelivery = createMockDelivery();

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      const esError = new Error('ES query failed');
      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockRejectedValue(esError);

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(obsAlarmFireMock).toHaveBeenCalledWith({
        name: 'UpdateDeliveryUseCase',
        description: 'failed to get cooler bag data',
        error: esError,
        severity: 'ERROR',
      });

      // Should not attempt to send notifications
      expect(fireEventMock).not.toHaveBeenCalled();
    });

    it('should continue delivery update even if notification fails', async () => {
      const aeDelivery = createMockDelivery();

      const updateSpy = jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 4, // Must be > threshold to trigger notifications
        },
      });

      fireEventMock.mockRejectedValue(new Error('All notifications failed'));

      const result = await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should still update delivery
      expect(updateSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.userId).toBe(aeDelivery.userId);
    });
  });

  describe('Integration with helper function', () => {
    it('should call getNumberOfCoolerBagsToBeReturned with correct parameters', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      const helperSpy = jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 2,
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      expect(helperSpy).toHaveBeenCalledWith(
        esDeliveryRepository,
        '2023-12-01',
        ['user-123'],
        14, // COOLER_BAG_REMINDER_DAYS_INTERVAL
      );
    });

    it('should handle user not found in bag results (defaults to 0)', async () => {
      const aeDelivery = createMockDelivery({ userId: 'user-999' });

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();

      // Return empty results
      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({});

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should not send notifications when user not found (defaults to 0)
      expect(fireEventMock).not.toHaveBeenCalled();
    });
  });

  describe('Slack notifications', () => {
    it('should send Slack alert when subscription expires and customer holds bags', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      const mockSubscription = {
        email: 'test@example.com',
        endsAt: '2023-12-01', // Same as delivery day - subscription expired
      };

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(mockSubscription as any);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 2,
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should send Slack alert for expired subscription holding bags
      expect(sendSlackMessageMock).toHaveBeenCalledWith({
        channel: 'ops-bag-alerts',
        type: 'ExpiredSubscriptionsHoldingCoolerBags',
        subscription: mockSubscription,
        delivery: aeDelivery,
        bagsStillNeeded: 2,
      });
    });

    it('should send Slack alert when customer holds more than threshold bags', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      const mockSubscription = {
        email: 'test@example.com',
        endsAt: '2023-12-15', // Not expired yet
      };

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(mockSubscription as any);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 4, // More than threshold (3)
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should send Slack alert for holding more than threshold
      expect(sendSlackMessageMock).toHaveBeenCalledWith({
        channel: 'ops-bag-alerts',
        type: 'CustomerHoldingMoreThanXDeliveries',
        subscription: mockSubscription,
        delivery: aeDelivery,
        bagsStillNeeded: 4,
        threshold: 3,
      });
    });

    it('should send BOTH Slack alerts when subscription expired AND bags exceed threshold', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      const mockSubscription = {
        email: 'test@example.com',
        endsAt: '2023-12-01', // Expired on delivery day
      };

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(mockSubscription as any);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 5, // Both expired AND exceeds threshold
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should send both Slack alerts
      expect(sendSlackMessageMock).toHaveBeenCalledTimes(2);

      expect(sendSlackMessageMock).toHaveBeenCalledWith({
        channel: 'ops-bag-alerts',
        type: 'ExpiredSubscriptionsHoldingCoolerBags',
        subscription: mockSubscription,
        delivery: aeDelivery,
        bagsStillNeeded: 5,
      });

      expect(sendSlackMessageMock).toHaveBeenCalledWith({
        channel: 'ops-bag-alerts',
        type: 'CustomerHoldingMoreThanXDeliveries',
        subscription: mockSubscription,
        delivery: aeDelivery,
        bagsStillNeeded: 5,
        threshold: 3,
      });
    });

    it('should NOT send expired subscription alert when subscription has not ended', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      const mockSubscription = {
        email: 'test@example.com',
        endsAt: '2023-12-15', // Still active
      };

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(mockSubscription as any);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 2, // Has bags but subscription not expired
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should not send expired subscription alert (only threshold alert if applicable)
      expect(sendSlackMessageMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ExpiredSubscriptionsHoldingCoolerBags',
        }),
      );
    });

    it('should NOT send threshold alert when bags are at or below threshold', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      const mockSubscription = {
        email: 'test@example.com',
        endsAt: '2023-12-15',
      };

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(mockSubscription as any);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 3, // Exactly at threshold (not exceeding)
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should not send threshold alert when bags = threshold
      expect(sendSlackMessageMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CustomerHoldingMoreThanXDeliveries',
        }),
      );
    });

    it('should NOT send any Slack alerts when bagsStillNeeded is 0', async () => {
      const aeDelivery = createMockDelivery({
        day: '2023-12-01',
        userId: 'user-123',
      });

      const mockSubscription = {
        email: 'test@example.com',
        endsAt: '2023-12-01', // Expired but no bags
      };

      jest.spyOn(deliveryRepository, 'findById').mockResolvedValue(aeDelivery);
      jest.spyOn(deliveryRepository, 'update').mockResolvedValue();
      jest.spyOn(subscriptionRepository, 'findById').mockResolvedValue(mockSubscription as any);

      jest.spyOn(helper, 'getNumberOfCoolerBagsToBeReturned').mockResolvedValue({
        [aeDelivery.userId]: {
          userId: aeDelivery.userId,
          bagsStillNeeded: 0,
        },
      });

      await useCase.exec(
        '123',
        {
          ...req,
          coolerBagNotReturned: true,
          coolerBagsReturned: 0,
        },
        'driver-123',
        'Driver Name',
      );

      // Should not send any Slack alerts when no bags are owed
      expect(sendSlackMessageMock).not.toHaveBeenCalled();
    });
  });
});
