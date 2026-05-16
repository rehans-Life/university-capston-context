import { Action } from './Action';
import { Customer } from './Customer';
import { Delivery } from './Delivery';
import { Driver } from './Driver';

export class Data {
  'customer': Customer;
  'driver': Driver;
  'delivery': Delivery;
  'action': Action;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'customer',
      baseName: 'customer',
      type: 'Customer',
    },
    {
      name: 'driver',
      baseName: 'driver',
      type: 'Driver',
    },
    {
      name: 'delivery',
      baseName: 'delivery',
      type: 'Delivery',
    },
    {
      name: 'action',
      baseName: 'action',
      type: 'Action',
    },
  ];

  public static getAttributeTypeMap() {
    return Data.attributeTypeMap;
  }
}
