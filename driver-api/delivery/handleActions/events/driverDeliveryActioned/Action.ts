export class Action {
  'type': string;
  'note'?: string;
  'newLocation'?: string;
  'createdAt': string;

  private static attributeTypeMap: Array<{ name: string; baseName: string; type: string }> = [
    {
      name: 'type',
      baseName: 'type',
      type: 'string',
    },
    {
      name: 'note',
      baseName: 'note',
      type: 'string',
    },
    {
      name: 'newLocation',
      baseName: 'newLocation',
      type: 'string',
    },
    {
      name: 'createdAt',
      baseName: 'createdAt',
      type: 'string',
    },
  ];

  public static getAttributeTypeMap() {
    return Action.attributeTypeMap;
  }
}
