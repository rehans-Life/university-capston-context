export class Delivery {
  'time': string;
  'kitchen': string;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'time',
      baseName: 'time',
      type: 'string',
    },
    {
      name: 'kitchen',
      baseName: 'kitchen',
      type: 'string',
    },
  ];

  public static getAttributeTypeMap() {
    return Delivery.attributeTypeMap;
  }
}
