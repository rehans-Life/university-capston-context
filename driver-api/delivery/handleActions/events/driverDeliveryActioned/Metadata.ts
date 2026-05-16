export class Metadata {
  'serviceFunction': string;
  'version': string;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'serviceFunction',
      baseName: 'serviceFunction',
      type: 'string',
    },
    {
      name: 'version',
      baseName: 'version',
      type: 'string',
    },
  ];

  public static getAttributeTypeMap() {
    return Metadata.attributeTypeMap;
  }
}
