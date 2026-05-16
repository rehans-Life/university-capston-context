export class Customer {
  'id': string;
  'name': string;
  'email': string;
  'phoneNumber': string;
  'lat': number;
  'lng': number;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'id',
      baseName: 'id',
      type: 'string',
    },
    {
      name: 'name',
      baseName: 'name',
      type: 'string',
    },
    {
      name: 'email',
      baseName: 'email',
      type: 'string',
    },
    {
      name: 'phoneNumber',
      baseName: 'phoneNumber',
      type: 'string',
    },
    {
      name: 'lat',
      baseName: 'lat',
      type: 'number',
    },
    {
      name: 'lng',
      baseName: 'lng',
      type: 'number',
    },
  ];

  public static getAttributeTypeMap() {
    return Customer.attributeTypeMap;
  }
}
