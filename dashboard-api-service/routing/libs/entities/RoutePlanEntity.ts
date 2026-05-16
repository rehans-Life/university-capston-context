import { DataType, Brand, Country, Kitchen, DeliveryTime } from 'libs/enums';
import { LatLng, ShiftActions } from 'libs/interfaces';
import { RouteItem, RoutePlan } from '../interfaces';
import { Entity } from 'libs/entities/DDB';

class RoutePlanEntity extends Entity<RoutePlan> implements RoutePlan {
  readonly id: DataType.routePlanNew;
  readonly sk: string; // unique id
  readonly tk: string; // day#time
  readonly fk: string; // driverId#day#time
  readonly eta: string;
  readonly day: string; //day
  readonly time: DeliveryTime;
  readonly deliveredPositions: string[];
  readonly routePlan: Record<string, RouteItem>;
  readonly priority: string[];
  readonly lastDeliveredId?: string;
  readonly country: Country;
  readonly kitchen: Kitchen;
  readonly dataType: DataType.routePlanNew;
  readonly driverActions: ShiftActions[];
  readonly totalDeliveries: number;
  readonly deliveredDeliveries: number;
  readonly kitchenPosition: LatLng;
  readonly driver: {
    id: string;
    driverName: string;
    phoneNumber: string;
    email: string;
  };
  readonly startingTime: string;

  readonly dispatch: {
    bags: {
      [k in Brand]: number;
    };
    departureTime: string;
    vanTemperature: number;
  };
  readonly canStartShift?: boolean;
  readonly damagedCoolerBags?: number;
  readonly deliveredCoolerBags?: number;
  readonly collectedCoolerBags?: number;
  readonly returnedCoolerBags?: number;
  readonly assignedRoutePlan?: string;

  protected getIndexMap() {
    return {};
  }
}

export default RoutePlanEntity;
