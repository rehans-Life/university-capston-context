import { DataType, Country, DeliveryTime, Kitchen as KitchenType } from 'libs/enums';
import { RoutingConfig } from '../../../services/driver/libs/interfaces';
import { Entity } from './Entity';
import { WindowType } from '../../../services/driver/libs/enums';
import { LatLng } from 'libs/interfaces';

export class RoutingConfigEntity extends Entity<RoutingConfig> implements RoutingConfig {
  readonly id: DataType.routingConfig;
  readonly sk: string; // unique id
  readonly country: Country;
  readonly kitchen: KitchenType;
  readonly time: DeliveryTime;
  readonly name: string;
  readonly enabled: boolean;
  readonly shiftStartTime: string;
  readonly shiftEndTime: string;
  readonly deliveryStartTime: string;
  readonly endAtKitchen: boolean;
  readonly deliveryEndTime: string | null;
  readonly avgDeliveryTime: number; // in seconds
  readonly travelDurationMultiple: number;
  readonly windowType: WindowType;
  readonly windowSize: number; // in minutes
  readonly lookbackDays?: number;
  readonly customDispatchLocation: LatLng | null;
  readonly autoAssignRoutePlans: boolean;
  readonly simulationStartTime: string;
  readonly zoneIds: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly dataType: DataType.routingConfig;
  readonly firstSubslotEndTime?: string;
  readonly costModel?: {
    costPerHourAfterSoftEndTime: number;
    costPerHourBeforeSoftStartTime: number;
    globalDurationCostPerHour: number;
  };
  readonly isDeliveryEndTimeNextDay: boolean;
  readonly isShiftEndTimeNextDay: boolean;
  readonly isSubslotTimeNextDay: boolean;
  readonly numberOfDrivers?: number;

  protected getIndexMap() {
    return {};
  }

  valueOf() {
    return {
      ...super.valueOf(),
      isDeliveryEndTimeNextDay: this.isDeliveryEndTimeNextDay,
      isShiftEndTimeNextDay: this.isShiftEndTimeNextDay,
      isSubslotTimeNextDay: this.isSubslotTimeNextDay
    };
  }
}
