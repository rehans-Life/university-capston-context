import { DeliveryArea, NationwideArea, Map } from '../../interfaces';
import { Country, DeliveryTime, Kitchen } from '../../enums';
import { Entity } from './Entity';

export class MapEntity extends Entity<Map> implements Map {
  readonly id: string;
  readonly sk: string;
  readonly deliveryAreas?: DeliveryArea[];
  readonly country: Country;
  readonly kitchen: Kitchen;
  readonly deliveryTime: DeliveryTime;
  readonly nationwideAreas?: NationwideArea[];
  readonly user?: {
    id: string;
    name: string;
  };

  protected getIndexMap(): Record<string, string[] | string> {
    return {};
  }
}
