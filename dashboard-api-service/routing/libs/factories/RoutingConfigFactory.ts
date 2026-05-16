import { RoutingConfigEntity } from '../../../driver/libs/entities';
import { RoutingConfig } from '../../../driver/libs/interfaces';
import { DataType, Country, DeliveryTime, Kitchen } from 'libs/enums';
import { LatLng } from 'libs/interfaces';
import { WindowType } from '../../../driver/libs/enums';
import { v4 as uuid } from 'uuid';

export const makeRoutingConfig = (
  name: string,
  time: DeliveryTime,
  kitchen: Kitchen,
  country: Country,
  enabled: boolean,
  shiftStartTime: string,
  shiftEndTime: string,
  deliveryStartTime: string,
  endAtKitchen: boolean,
  deliveryEndTime: string | null,
  avgDeliveryTime: number,
  travelDurationMultiple: number,
  windowType: WindowType,
  windowSize: number,
  lookbackDays: number | undefined,
  customDispatchLocation: LatLng | null,
  autoAssignRoutePlans: boolean,
  simulationStartTime: string,
  zoneIds: string[],
  numberOfDrivers?: number,
  costModel?: {
    costPerHourAfterSoftEndTime: number;
    costPerHourBeforeSoftStartTime: number;
    globalDurationCostPerHour: number;
  },
  isDeliveryEndTimeNextDay?: boolean,
  isShiftEndTimeNextDay?: boolean,
  isSubslotTimeNextDay?: boolean,
  firstSubslotEndTime?: string
) => {
  const routingConfig: RoutingConfig = {
    sk: uuid(),
    name,
    time,
    kitchen,
    country,
    enabled,
    shiftStartTime,
    shiftEndTime,
    deliveryStartTime,
    endAtKitchen,
    deliveryEndTime,
    avgDeliveryTime,
    travelDurationMultiple,
    windowType,
    windowSize,
    customDispatchLocation,
    autoAssignRoutePlans,
    simulationStartTime,
    zoneIds,
    firstSubslotEndTime,
    costModel,
    isDeliveryEndTimeNextDay: isDeliveryEndTimeNextDay ?? false,
    isShiftEndTimeNextDay: isShiftEndTimeNextDay ?? false,
    isSubslotTimeNextDay: isSubslotTimeNextDay ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    id: DataType.routingConfig,
    ...(numberOfDrivers !== undefined && { numberOfDrivers }),
    ...(lookbackDays !== undefined && { lookbackDays })
  };

  return new RoutingConfigEntity(routingConfig);
};
