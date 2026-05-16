export class Driver {
  'name': string;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'name',
      baseName: 'name',
      type: 'string',
    },
  ];

  public static getAttributeTypeMap() {
    return Driver.attributeTypeMap;
  }
}
