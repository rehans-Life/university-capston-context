import { Country, DeliveryTime, Kitchen, DataType, WindowType } from 'libs/enums';

/**
 * Mock routing config that simulates a real routing config entity
 */
export const mockRoutingConfig = {
  id: DataType.routingConfig,
  sk: 'routing-config-1',
  name: 'Test Morning Route',
  country: Country.BH,
  kitchen: Kitchen.BH1,
  time: DeliveryTime.morning,
  enabled: true,
  shiftStartTime: '2025-01-15T03:00:00.000Z',
  shiftEndTime: '2025-01-15T10:00:00.000Z',
  deliveryStartTime: '2025-01-15T04:00:00.000Z',
  deliveryEndTime: '2025-01-15T09:00:00.000Z',
  avgDeliveryTime: 120,
  windowType: WindowType.soft,
  windowSize: 30,
  travelDurationMultiple: 1.0,
  customDispatchLocation: null,
  endAtKitchen: true,
  zoneIds: ['zone-1', 'zone-2'],
  autoAssignRoutePlans: false,
  simulationStartTime: '2025-01-15T04:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  dataType: DataType.routingConfig,
  isDeliveryEndTimeNextDay: false,
  isShiftEndTimeNextDay: false,
  isSubslotTimeNextDay: false,
  firstSubslotEndTime: undefined,
  costModel: undefined,
  valueOf: function () {
    return { ...this };
  }
};

export const mockRoutingConfigWithCustomDispatch = {
  ...mockRoutingConfig,
  sk: 'routing-config-custom-dispatch',
  customDispatchLocation: { lat: 26.22, lng: 50.59 }
};

export const mockRoutingConfigWithCostModel = {
  ...mockRoutingConfig,
  sk: 'routing-config-cost-model',
  costModel: {
    costPerHourAfterSoftEndTime: 2,
    costPerHourBeforeSoftStartTime: 1,
    globalDurationCostPerHour: 1.5
  }
};

export const mockRoutingConfigNoZones = {
  ...mockRoutingConfig,
  sk: 'routing-config-no-zones',
  zoneIds: []
};

export const mockRoutingConfigNextDay = {
  ...mockRoutingConfig,
  sk: 'routing-config-next-day',
  isDeliveryEndTimeNextDay: true,
  isShiftEndTimeNextDay: true,
  deliveryEndTime: '2025-01-16T01:00:00.000Z',
  shiftEndTime: '2025-01-16T02:00:00.000Z'
};

export const mockRoutingConfigGB = {
  ...mockRoutingConfig,
  sk: 'routing-config-gb',
  country: Country.GB,
  kitchen: Kitchen.GB1,
  time: DeliveryTime.evening,
  firstSubslotEndTime: '2025-01-15T19:00:00.000Z'
};

export const mockRoutingConfigHardWindow = {
  ...mockRoutingConfig,
  sk: 'routing-config-hard',
  windowType: WindowType.hard
};

/**
 * Mock map with delivery areas and drivers
 * Day index 3 = Wednesday (for '2025-01-15' which is a Wednesday)
 */
export const mockMap = {
  id: `${DataType.map}#${Country.BH}`,
  sk: `${Kitchen.BH1}#${DeliveryTime.morning}`,
  country: Country.BH,
  kitchen: Kitchen.BH1,
  deliveryTime: DeliveryTime.morning,
  deliveryAreas: [
    {
      id: 'zone-1',
      bounds: [
        { lat: 26.2, lng: 50.5 },
        { lat: 26.2, lng: 50.6 },
        { lat: 26.3, lng: 50.6 },
        { lat: 26.3, lng: 50.5 }
      ],
      // drivers array indexed by day number (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
      drivers: ['driver-1', 'driver-1', 'driver-1', 'driver-1', 'driver-1', 'driver-1', 'driver-1']
    },
    {
      id: 'zone-2',
      bounds: [
        { lat: 26.1, lng: 50.4 },
        { lat: 26.1, lng: 50.5 },
        { lat: 26.2, lng: 50.5 },
        { lat: 26.2, lng: 50.4 }
      ],
      drivers: ['driver-2', 'driver-2', 'driver-2', 'driver-2', 'driver-2', 'driver-2', 'driver-2']
    },
    {
      id: 'zone-3',
      bounds: [
        { lat: 26.0, lng: 50.3 },
        { lat: 26.0, lng: 50.4 },
        { lat: 26.1, lng: 50.4 },
        { lat: 26.1, lng: 50.3 }
      ],
      // zone-3 is also served by driver-1 (but not in config zoneIds)
      drivers: ['driver-1', 'driver-1', 'driver-1', 'driver-1', 'driver-1', 'driver-1', 'driver-1']
    }
  ],
  nationwideAreas: []
};

export const mockMapNoDrivers = {
  ...mockMap,
  deliveryAreas: [
    {
      id: 'zone-1',
      bounds: [
        { lat: 26.2, lng: 50.5 },
        { lat: 26.2, lng: 50.6 },
        { lat: 26.3, lng: 50.6 },
        { lat: 26.3, lng: 50.5 }
      ],
      // No drivers assigned on any day
      drivers: [null, null, null, null, null, null, null]
    }
  ]
};

/**
 * Mock kitchen entity
 */
export const mockKitchenEntity = {
  id: Kitchen.BH1,
  sk: Kitchen.BH1,
  country: Country.BH,
  location: { lat: 26.22, lng: 50.59 },
  capacity: 1000,
  emails: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
};

/**
 * Mock extended deliveries (returned by fetchAndMergeDeliveries)
 */
export const mockExtendedDeliveries = [
  {
    id: 'delivery-1',
    sk: 'delivery-sk-1',
    time: DeliveryTime.morning,
    userId: 'user-1',
    name: 'John Doe',
    deliveryAddress: {
      id: 'addr-1',
      lat: 26.25,
      lng: 50.55,
      city: 'Manama',
      street: 'Street 1',
      building: '10',
      apartment: '1',
      district: 'Block 1',
      region: 'Capital',
      country: Country.BH,
      type: 'home',
      default: true
    },
    deliveryDay: '2025-01-15',
    shortId: 'A001',
    brand: 'calo',
    food: [],
    isDonated: false
  },
  {
    id: 'delivery-2',
    sk: 'delivery-sk-2',
    time: DeliveryTime.morning,
    userId: 'user-2',
    name: 'Jane Smith',
    deliveryAddress: {
      id: 'addr-2',
      lat: 26.15,
      lng: 50.45,
      city: 'Riffa',
      street: 'Street 2',
      building: '20',
      apartment: '2',
      district: 'Block 2',
      region: 'Southern',
      country: Country.BH,
      type: 'home',
      default: true
    },
    deliveryDay: '2025-01-15',
    shortId: 'A002',
    brand: 'calo',
    food: [],
    isDonated: false
  },
  {
    id: 'delivery-3',
    sk: 'delivery-sk-3',
    time: DeliveryTime.morning,
    userId: 'user-3',
    name: 'Alice Brown',
    deliveryAddress: {
      id: 'addr-3',
      lat: 26.05,
      lng: 50.35,
      city: 'Muharraq',
      street: 'Street 3',
      building: '30',
      apartment: '3',
      district: 'Block 3',
      region: 'Northern',
      country: Country.BH,
      type: 'home',
      default: true
    },
    deliveryDay: '2025-01-15',
    shortId: 'A003',
    brand: 'calo',
    food: [],
    isDonated: false
  }
];

/**
 * Mock ES deliveries for driver metrics (returned by getDeliveriesForDriverMetrics)
 */
export const mockPlanDeliveries = {
  rows: [
    {
      id: 'delivery-1',
      userId: 'user-1',
      name: 'John Doe',
      phoneNumber: '+97312345678',
      time: DeliveryTime.morning,
      deliveryAddress: {
        id: 'addr-1',
        lat: 26.25,
        lng: 50.55
      },
      deliveredAt: undefined
    },
    {
      id: 'delivery-2',
      userId: 'user-2',
      name: 'Jane Smith',
      phoneNumber: '+97387654321',
      time: DeliveryTime.morning,
      deliveryAddress: {
        id: 'addr-2',
        lat: 26.15,
        lng: 50.45
      },
      deliveredAt: undefined
    }
  ],
  total: 2
};

/**
 * Mock historical deliveries (for average delivery time calculation)
 */
export const mockHistoricalDeliveries = {
  data: [
    {
      id: 'hist-1',
      userId: 'user-1',
      time: DeliveryTime.morning,
      deliveryAddress: { id: 'addr-1' },
      deliveredAt: '2025-01-10T06:30:00.000Z' // 06:30
    },
    {
      id: 'hist-2',
      userId: 'user-1',
      time: DeliveryTime.morning,
      deliveryAddress: { id: 'addr-1' },
      deliveredAt: '2025-01-11T07:00:00.000Z' // 07:00
    },
    {
      id: 'hist-3',
      userId: 'user-2',
      time: DeliveryTime.morning,
      deliveryAddress: { id: 'addr-2' },
      deliveredAt: '2025-01-12T05:30:00.000Z' // 05:30
    }
  ],
  total: 3
};

/**
 * Mock dynamic routing evaluation result
 */
export const mockDynamicRoutingResult = {
  dynamicRoutedDeliveries: [
    {
      id: 'delivery-1',
      sk: 'delivery-sk-1',
      time: DeliveryTime.morning,
      deliveryAddress: {
        id: 'addr-1',
        lat: 26.25,
        lng: 50.55
      },
      deliveryDay: '2025-01-15',
      shortId: 'A001',
      brand: 'calo',
      userId: 'user-1'
    },
    {
      id: 'delivery-2',
      sk: 'delivery-sk-2',
      time: DeliveryTime.morning,
      deliveryAddress: {
        id: 'addr-2',
        lat: 26.15,
        lng: 50.45
      },
      deliveryDay: '2025-01-15',
      shortId: 'A002',
      brand: 'calo',
      userId: 'user-2'
    }
  ],
  skippedCount: 1
};

export const mockEmptyDynamicRoutingResult = {
  dynamicRoutedDeliveries: [],
  skippedCount: 3
};
