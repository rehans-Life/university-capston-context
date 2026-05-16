import { Kitchen } from '@calo/types';
import { DataType, DeliveryTime, WindowType, ShiftActionType, Country, Kitchen as KitchenEnum } from './enums';

export interface LatLng {
  lat: number;
  lng: number;
}
interface DataRow {
  id: DataType | string;
  sk: string;
  dataType: string; //DataType;
  tk?: string;
  fk?: string;
  fhk?: string;
  sihk?: string;
  sehk?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  ttl?: number;
}
export interface DeliveryRoutePlan {
  travelTime: number;
  toBeDeliveredAt?: string;
}

export interface DeliveryETAPriority {
  day: string; //yyyy-mm-dd
  priority: number;
  groupBufferTime?: number;
  time?: string;
  deliveryTime?: string; //earlyMorning, morning, evening
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ETAs?: ETA[];
}

export interface ETA {
  time: string;
  createdAt: string;
}

export interface ETAResponse {
  range: {
    gte: string;
    lte: string;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ETAs?: ETA[];
  time?: string;
}

export interface DeliveryEstimation extends DataRow {
  id: DataType.deliveryEta;
  sk: string; //subscriptionId
  etas: DeliveryETAPriority[];
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface RouteCalculationProps {
  DeparturePosition: number[];
  DestinationPosition: number[];
  OptimizeRoute?: boolean;
  WaypointPositions?: number[][];
  DepartNow?: boolean;
  DepartureTime?: string;
}

export interface RouteCalculationRequest {
  kitchen: Kitchen;
  departurePosition: LatLng;
  routePoints: RoutePoint[];
  deliveryStartTime: string;
  optimize: boolean;
}

export interface RoutePoint {
  id: string;
  priority: number;
  lat: number;
  lng: number;
  bufferTime?: number;
}

export interface GetRoutingReq {
  curPosLng: number;
  curPosLat: number;
  destLng: number;
  destLat: number;
}

export interface GetRouteProps {
  data: {
    id: string;
    lat: number;
    lng: number;
  }[];
  sort?: boolean;
}

export interface RouteItem extends DeliveryRoutePlan {
  id: string;
  priority: number;
  isMatched: boolean;
  origin: LatLng;
}

export interface RouteProvider {
  getRoute: (data: GetRouteProps, defaultResponse: RouteItem[]) => Promise<RouteItem[]>;
}

export interface RoutingOutput {
  simulated: { route: AutoRouteItem[]; metrics: RouteMetrics };
  actual: { route: AutoRouteItem[]; metrics: RouteMetrics };
  vehicleLabel: string;
  error?: string;
  routingParams?: GenerateTimeWindowRouteParams;
}

export interface AutoRouteItem {
  id: string;
  deliveredAt?: string;
  priority: number;
  avgDeliveredAt?: string;
  name: string;
  withinWindow?: boolean;
  lat: number;
  lng: number;
  isSkipped?: boolean;
  deliveredLocationDistance?: number;
  timeWindows?: TimeWindow[];
  time?: DeliveryTime;
}

export interface RouteMetrics {
  totalWithinWindow: number;
  deliveryDuration: number;
  duration: number;
  performedDeliveries: number;
  skippedDeliveries: number;
  distance?: number;
  totalDuration?: string;
  waitDuration?: string;
  delayDuration?: string;
  travelDuration?: string;
  visitDuration?: string;
}

export interface TimeWindow {
  startTime?: string;
  endTime?: string;
  softStartTime?: string;
  softEndTime?: string;
  costPerHourAfterSoftEndTime?: number;
  costPerHourBeforeSoftStartTime?: number;
}

export interface GenerateTimeWindowRouteParams {
  fileName: string;
  shipments: Shipment[];
  vehicles: Vehicle[];
  startTimeIsoString: string;
  endTimeIsoString: string;
  routePlanStartTimeIsoString: string;
  windowType: WindowType;
  kitchenLocation: LatLng;
  deliveriesWithTimeWindows: AutoRouteItem[];
  endAtKitchen: boolean;
  globalDurationCostPerHour?: number;
}

export interface Shipment {
  label: string;
  pickups: {
    arrivalLocation: LatitudeLongitude;
    timeWindows: TimeWindow[];
  }[];
  deliveries: {
    arrivalLocation: LatitudeLongitude;
    timeWindows: TimeWindow[];
    duration: string;
  }[];
}

export interface Vehicle {
  travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
  startLocation: LatitudeLongitude;
  endLocation: LatitudeLongitude;
  startTimeWindows: TimeWindow[];
  travelDurationMultiple: number;
  label: string;
}

export interface LatitudeLongitude {
  latitude: number;
  longitude: number;
}

export interface RouteDuration {
  order: number;
  duration: number;
  priority?: number;
}

export interface ESRoutePlan {
    id: string;
    day: string;
    time: DeliveryTime;
    country: Country;
    kitchen: KitchenEnum;
    routePlan: Record<string, DeliveryRoutePlan>;
    priority: string[];
    lastDeliveredId?: string;
    driverActions: ShiftActions[];
    totalDeliveries: number;
    deliveredDeliveries: number;
    deliveredPositions: string[];
    kitchenPosition: LatLng;
    driver: {
      id: string;
      driverName: string;
      phoneNumber: string;
      email: string;
    };
    startingTime: string;
    canStartShift?: boolean;
    skippedScannings?: number;
    deliveredCoolerBags?: number;
    collectedCoolerBags?: number;
    returnedCoolerBags?: number;
    assignedRoutePlan?: string;
  }
  
  export type ShiftActions =
  | {
      type: ShiftActionType.STARTED_SHIFT;
      time: string;
      distance: number;
    }
  | {
      type: ShiftActionType.STARTED_DELIVERING;
      time: string;
    }
  | {
      type: ShiftActionType.FINISHED_SHIFT;
      time: string;
    };

    export type DriverApiEvent = APIGatewayProxyEvent & { driverId?: string };

    export interface BaseSlackMapping {
      driverName: string;
      driverPhoneNumber: string;
      customerName: string;
      customerPhoneNumber: string;
    }
    export interface NoCustomerSlackMapping extends BaseSlackMapping {
      customerAddress: string;
    }
    
    export interface MapMarkerUpdateMapping extends BaseSlackMapping {
      oldPosition: LatLng;
      newPosition: LatLng;
    }
    
    export interface AddDriverNoteMapping extends NoCustomerSlackMapping {
      note: string;
    }
    
    export interface DeliveryAdditionalData {
      pendingAmount: number;
      currency: Currency;
      driverNote: string;
      driverImages?: string[];
      priority?: number;
      eta?: Range;
      groupBufferTime?: number;
      unreturnedCoolerBags?: number;
    }
    
    export interface RoutePoint {
      id: string;
      priority?: number;
      lat?: number;
      lng?: number;
      bufferTime?: number;
    }
    
    export interface RouteCalculationRequest {
      departurePosition: LatLng;
      routePoints: RoutePoint[];
      deliveryStartTime: string;
      optimize: boolean;
    }

    export interface PreferredRouteItem {
      id: string;
      userId: string;
      priority: number;
      groupBufferTime?: number;
      origin: {
        lat: number;
        lng: number;
      };
    }
    
    
    export type RoutePointWithEta = RoutePoint & { eta: string };
    export type PreferredRouteItemWithDeliveryTime = PreferredRouteItem & {
      deliveryTime: string;
      groupBufferTime?: number;
    };
    
    export interface HandleDeliveredStatusReq {
      deliveryId: string;
      driverId: string;
      day: string;
      time: string;
      userId: string;
      reasonForNotFollowPriority?: string;
      deliveredAtLocation?: LatLng;
    }
    
    export interface ProofOfDelivery {
      images?: string[];
      note?: string;
    }
    
    export interface UpdateDeliveryReq {
      deliveryStatus?: DDeliveryStatus;
      reasonForNotFollowPriority?: string;
      coolerBagNotReturned?: boolean;
      coolerBagsReturned?: number;
      deliveredAtLocation?: LatLng;
      pod?: ProofOfDelivery;
    }
    
    export interface DeliveryETAPriority {
      day: string; //yyyy-mm-dd
      priority: number;
      groupBufferTime?: number;
      deliveryTime?: DeliveryTime;
      time?: string;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ETAs?: ETA[];
    }
    
    export interface ETA {
      time: string;
      createdAt: string;
    }
    
    export interface DeliveryEstimation extends DataRow {
      id: DataType.deliveryEta;
      sk: string; //subscriptionId
      etas?: DeliveryETAPriority[];
    }
    
    export interface LocationServiceGetRoutePathResponse {
      waypoints: {
        latitude: number;
        longitude: number;
      }[];
      duration: number;
    }
    
    export interface ESRoutePlan {
      id: string; // unique id of route plan
      day: string; // ISO 8601
      time: DeliveryTime; // ISO 8601
      country: Country;
      kitchen: Kitchen;
      routePlan: Record<string, DeliveryRoutePlan>; // key - delivery id
      priority: string[]; // delivery id ordered by priority
      lastDeliveredId?: string;
      driverActions: ShiftActions[];
      totalDeliveries: number;
      deliveredDeliveries: number;
      deliveredPositions: string[];
      kitchenPosition: LatLng;
      driver: {
        id: string;
        driverName: string;
        phoneNumber: string;
        email: string;
      };
      startingTime: string;
      canStartShift?: boolean;
      skippedScannings?: number;
    }
    
    export interface DeliveryPlanFilters {
      day: Range;
      time?: DeliveryTime;
      country?: Country;
      kitchen?: Kitchen;
      driverId?: string;
    }
    
    export interface Delivery {
      id: string;
      userId: string;
      paymentMethod: PaymentMethod;
      deliveryAddress: DeliveryAddress;
      name: string;
      phoneNumber: string;
      day: string;
      time?: DeliveryTime;
      status: DeliveryStatus;
      pendingAmount: number;
      deliveryStatus?: DDeliveryStatus;
      priority?: number;
      shortId: string;
      currency: Currency;
      brand: Brand;
      groupBufferTime?: number;
      eta?: Range;
      deliveredAt?: string;
      withCoolerBag?: boolean;
      unreturnedCoolerBags?: number;
      coolerBagsReturned?: number;
    }
    
    export interface GetDeliveriesReq {
      day: string;
      withNewPriorities?: boolean;
      time: DeliveryTime;
    }
    
    export type GetCountryConfigRes = Omit<_GetCountryConfigRes, 'delivery'> & {
      delivery?: {
        timings: KitchenConfigDeliveryTime[];
        clusterRadiusM?: number;
      };
    };
    
    interface KitchenConfigDeliveryTime {
      id: DeliveryTime;
      from: string;
      to: string;
      slots?: TimeSlotConfig[];
    }

    export interface TimeSlot {
      from: string;
      to: string;
    }
    
    export interface TimeSlotConfig extends TimeSlot {
      enabled: boolean;
    }
    