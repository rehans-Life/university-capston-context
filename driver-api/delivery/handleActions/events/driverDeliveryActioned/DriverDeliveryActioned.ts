import { Data } from './Data';
import { Metadata } from './Metadata';

export class DriverDeliveryActioned {
  'data': Data;
  'metadata': Metadata;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'data',
      baseName: 'data',
      type: 'Data',
    },
    {
      name: 'metadata',
      baseName: 'metadata',
      type: 'Metadata',
    },
  ];

  public static getAttributeTypeMap() {
    return DriverDeliveryActioned.attributeTypeMap;
  }
}
