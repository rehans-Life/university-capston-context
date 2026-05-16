import { DeliveryTime } from '@calo/types';

import { GetDeliveriesReq } from '@libs/driver-types';

const req: GetDeliveriesReq = {
  day: '2021-01-01',
  time: DeliveryTime.morning,
};

export default req;
