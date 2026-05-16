import { ESRoutePlan, DeliveryRoutePlan, LatLng, ShiftActions } from '../interfaces';
import { Entity } from './Entity';
import { DeliveryTime, Country, Kitchen } from '../enums';

export class RoutePlanEntity extends Entity<ESRoutePlan> implements ESRoutePlan {
  readonly id: string; // unique id of route plan
  readonly day: string; // ISO 8601
  readonly time: DeliveryTime; // ISO 8601
  readonly country: Country;
  readonly kitchen: Kitchen;
  readonly routePlan: Record<string, DeliveryRoutePlan>; // key - delivery id
  readonly priority: string[]; // delivery id ordered by priority
  readonly lastDeliveredId?: string;
  readonly driverActions: ShiftActions[];
  readonly totalDeliveries: number;
  readonly deliveredDeliveries: number;
  readonly deliveredPositions: string[];
  readonly kitchenPosition: LatLng;
  readonly driver: {
    id: string;
    driverName: string;
    phoneNumber: string;
    email: string;
  };
  readonly startingTime: string;
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
