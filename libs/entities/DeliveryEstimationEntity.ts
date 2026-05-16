import { BaseEntity } from '@calo/core';

import { DataType } from '../enums';
import { DeliveryEstimation, DeliveryETAPriority } from '../interfaces';

class DeliveryEstimationEntity extends BaseEntity<DeliveryEstimation> implements DeliveryEstimation {
  declare readonly id: DataType.deliveryEta;
  declare readonly sk: string; //subscriptionId
  declare readonly etas: DeliveryETAPriority[];

  protected getIndexMap() {
    return {};
  }
}

export default DeliveryEstimationEntity;
