import { DeliveryTime } from '@calo/types';

import { HandleDeliveredStatusReq } from '../../../../libs/interfaces';

export const req: HandleDeliveredStatusReq = {
  day: '2023-01-01',
  deliveryId: '123',
  driverId: '123',
  time: DeliveryTime.morning,
  userId: '123',
  reasonForNotFollowPriority: 'test',
};
