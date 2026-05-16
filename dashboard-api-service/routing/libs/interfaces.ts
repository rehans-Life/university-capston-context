import {
  Brand,
  Country,
  Currency,
  DDeliveryStatus,
  DeliveryStatus,
  DeliveryTime,
  DietType,
  Kitchen,
  PlanType
} from 'libs/enums';
import { ShiftActionType } from 'libs/enums';
import {
  DataRow,
  Dictionary,
  LatLng,
  Range,
  Kitchen as IKitchen,
  DeliveryForRouteGeneration,
  RouteGenerationDelivery
} from 'libs/interfaces';
import { DriverStatus, RouteItemActionType, WindowType } from './enums';

export interface Driver {
  readonly id: string;
  readonly cognitoId?: string;
  readonly name: string;
  readonly phoneNumber: string;
  readonly email: string;
  readonly address: string;
  readonly country: Country;
  readonly kitchen: Kitchen;
  readonly status: DriverStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface IDriver {
  id: string;
  driverName: string;
  email: string;
  phoneNumber: string;
  kitchen: Kitchen;
}

export interface DriverCoolerBagStats {
  driverId: string;
  driverName: string;
  deliveriesWithCoolerBag: number;
  totalCoolerBagsReturned: number;
  damagedCoolerBags: number;
  routePlanId?: string;
}

export interface CustomerCoolerBag {
  customerId: string;
  customerName: string;
  pendingBags: number;
  phoneNumber: string;
  endsAt: string | null;
  deliveryAddress: string;
  deliveryLocation: LatLng;
  deliveryId: string | undefined;
  lastCoolerBagReturned: string | undefined;
  driver: {
    id: string;
    name: string;
  } | null;
}

interface SortMode {
  orderMode: 'asc' | 'desc';
}

export interface DriversDeliveriesSort extends SortMode {
  orderBy: 'name' | 'delivered' | 'received' | 'damaged';
}

export interface DeliveryFilters {
  ids?: string[];
  day: Range;
  status: DeliveryStatus[];
  deliveryTime?: DeliveryTime;
  country?: string;
  region?: string[];
  kitchen?: Kitchen;
  deliveryStatus?: DDeliveryStatus;
  userIds?: string[];
  driverId?: string;
  name?: string;
  phoneNumber?: string;
  skipped?: boolean;
  planType?: PlanType[];
  dietType?: DietType[];
  foodIds?: string[];
  brand?: Brand;
  withCutlery?: boolean;
  withCoolerBag?: boolean;
  pendingBags?: number;
  shortId?: string;
  emptyFood?: boolean;
  expired?: boolean;
  nearExpiry?: boolean;
}

export interface GetDeliveriesReq extends DeliveryFilters {
  sort: DriversDeliveriesSort;
  page: number;
  limit: number;
}

export interface DriverListReq {
  cursor?: string;
  country?: Country;
  kitchen?: Kitchen;
}

export interface DriverUpdateReq {
  name?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  country?: Country;
  kitchen?: Kitchen;
  status?: DriverStatus;
}

export interface DriverCreateReq extends Required<DriverUpdateReq> {
  password: string;
}

// ─── Route-plan types ────────────────────────────────────────────────────────

export interface VanData {
  temp?: string;
  bags?: string;
}

export type ShiftActions =
  | {
      type: ShiftActionType.STARTED_SHIFT;
      time: string; // ISO 8601
      distance: number;
    }
  | {
      type: ShiftActionType.STARTED_DELIVERING;
      time: string; // ISO 8601
      vanData?: VanData;
      autoGenerateRoute?: boolean;
    }
  | {
      type: ShiftActionType.FINISHED_SHIFT;
      time: string; // ISO 8601
    };

export interface TimeWindow {
  startTime?: string;
  endTime?: string;
  softStartTime?: string;
  softEndTime?: string;
  costPerHourAfterSoftEndTime?: number;
  costPerHourBeforeSoftStartTime?: number;
}

export interface LatitudeLongitude {
  latitude: number;
  longitude: number;
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

export interface AutoRouteItem {
  id: string;
  deliveryId?: string;
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
  travelMode: string;
  startLocation: LatitudeLongitude;
  endLocation?: LatitudeLongitude;
  startTimeWindows: TimeWindow[];
  travelDurationMultiple: number;
  label: string;
}

export interface GenerateTimeWindowRouteParams {
  fileName: string;
  shipments: Shipment[];
  vehicles: Vehicle[];
  startTimeIsoString: string;
  endTimeIsoString: string;
  deliveryStartTimeIsoString?: string;
  deliveryEndTimeIsoString?: string;
  routePlanStartTimeIsoString: string;
  windowType: WindowType;
  kitchenLocation: LatLng;
  deliveriesWithTimeWindows: AutoRouteItem[];
  endAtKitchen: boolean;
  globalDurationCostPerHour?: number;
  averageDeliveryTime?: number;
  travelDurationMultiple?: number;
  windowSize?: number;
  lookbackDays?: number;
  shiftEndTime?: string;
  costModel?: {
    costPerHourAfterSoftEndTime: number;
    costPerHourBeforeSoftStartTime: number;
    globalDurationCostPerHour: number;
  };
  firstSubslotEndTime?: string;
  isDeliveryEndTimeNextDay?: boolean;
  isShiftEndTimeNextDay?: boolean;
  isSubslotTimeNextDay?: boolean;
  kitchen?: Kitchen;
  country?: Country;
  time?: DeliveryTime;
}

export interface RoutingOutput {
  simulated: { route: AutoRouteItem[]; metrics: RouteMetrics };
  actual: { route: AutoRouteItem[]; metrics: RouteMetrics };
  vehicleLabel: string;
  error?: string;
  routingParams?: GenerateTimeWindowRouteParams;
}

export interface RoutePoint {
  id: string;
  priority: number;
  lat: number;
  lng: number;
  bufferTime?: number;
}

export type RoutePointWithEta = RoutePoint & { eta: string };

export interface RouteCalculationRequest {
  departurePosition: LatLng;
  routePoints: RoutePoint[];
  deliveryStartTime: string;
  optimize: boolean;
}

export interface DeliveryLocationUpdatesRouteItemAction {
  type: RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES;
  newLocation: string;
}

export interface OtherRouteItemAction {
  type: Exclude<RouteItemActionType, RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES>;
}

export type RouteItemAction = {
  createdAt: string;
  note?: string;
} & (DeliveryLocationUpdatesRouteItemAction | OtherRouteItemAction);

export interface RouteItem {
  id: string;
  priority: number;
  isMatched: boolean;
  origin: LatLng;
  travelTime: number;
  toBeDeliveredAt?: string;
  reasonForNotFollowPriority?: string;
  actions?: RouteItemAction[];
  deliveredAtLocation?: LatLng;
  deliveryDistanceDeviation?: number;
}

export interface RoutePlan extends DataRow {
  sk: string; // unique id
  tk: string; // day#time
  fk: string; // driverId#day
  day: string; // ISO 8601
  time: DeliveryTime; // ISO 8601
  country: Country;
  kitchen: Kitchen;
  routePlan: Record<string, RouteItem>; // key - delivery id
  priority: string[]; // delivery id ordered by priority
  deliveredPositions: string[];
  lastDeliveredId?: string;
  driverActions: ShiftActions[];
  totalDeliveries: number;
  deliveredDeliveries: number;
  kitchenPosition: LatLng;
  driver: {
    id: string;
    driverName: string;
    phoneNumber: string;
    email: string;
  };
  startingTime: string;
  dispatch?: {
    bags: {
      [k in Brand]: number;
    };
    departureTime: string;
    vanTemperature: number;
  };
  canStartShift?: boolean;
  damagedCoolerBags?: number;
  deliveredCoolerBags?: number;
  collectedCoolerBags?: number;
  returnedCoolerBags?: number;
  assignedRoutePlan?: string;
}

export interface DriverMetrics {
  id: string;
  day: string;
  time: DeliveryTime;
  canStartShift: boolean;
  deliveredCoolerBags?: number;
  collectedCoolerBags?: number;
  returnedCoolerBags?: number;
  driverActions: ShiftActions[];
  totalDeliveries?: number;
  deliveredDeliveries?: number;
  kitchenPosition: LatLng;
  startShiftTime: string;
  routePlan: Record<string, RouteItem>;
  driver: {
    id: string;
    driverName: string;
    email: string;
    phoneNumber: string;
  };
  allowPhotographicNotes: boolean;
}

export interface ETA {
  time: string;
  createdAt: string;
}

export interface ETARange {
  range?: {
    gte: string;
    lte: string;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ETAs?: ETA[];
  time?: string;
}

export interface LocationServiceGetRoutePathResponse {
  waypoints: {
    latitude: number;
    longitude: number;
  }[];
  duration: number;
}

export interface GetRoutingReq {
  curPosLng: number;
  curPosLat: number;
  destLng: number;
  destLat: number;
}

export interface UpdateDriverMetricReq {
  canStartShift?: boolean;
  damagedCoolerBags?: number;
  deliveredCoolerBags?: number;
  collectedCoolerBags?: number;
  returnedCoolerBags?: number;
  assignedRoute?: { id: string; eta: string; withinWindow: boolean }[];
  metrics?: RouteMetrics;
  fileName?: string;
}

export interface BatchAllowDriversToStartShiftReq {
  ids: string[];
}

export interface RecalculateEtaRequest {
  deliveries: AutoRouteItem[];
  parameters: {
    startTime: string;
    endTime: string;
    averageDeliveryTime: number;
    travelDurationMultiple: number;
  };
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

export interface InvoiceCodes extends DataRow {
  id: string;
  sk: string;
  codes: Dictionary<string>;
}

export interface BatchGenerateRoutePlanProps {
  country: Country;
  kitchen: IKitchen;
  deliveries: DeliveryForRouteGeneration[];
  day: string;
  isPreview: boolean;
}

export type CustomInvoiceCodes = Dictionary<Dictionary<{ [key in DeliveryTime]?: Dictionary<string> }>>;
export type DeliveriesCountPerDriverByPcPerTime = Dictionary<Dictionary<{ [key in DeliveryTime]?: number }>>;

export interface RouteGenerationDeliveries {
  id: string;
  coords: LatLng;
  deliveryDay: string;
  brand: Brand;
  userId: string;
  postalCode?: string;
}
export interface GenerateRoutePlanProps {
  country: Country;
  kitchen: Kitchen;
  deliveries: RouteGenerationDelivery[];
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverPhoneNumber: string;
  day: string;
  time: DeliveryTime;
  kitchenLocation: LatLng;
  isPreview: boolean;
  ukInvoiceCodes: CustomInvoiceCodes;
}

export interface DeliveryChangePlansSyncReq {
  oldDriverId?: string;
  newDriverId?: string;
  newLocation?: LatLng;
  oldDeliveryTime?: DeliveryTime;
  newDeliveryTime?: DeliveryTime;
}

// Re-export Currency for use in route-plan utils
export { Currency };

export interface MultiRouteOutput {
  routes: {
    simulated: { route: AutoRouteItem[]; metrics: RouteMetrics };
    actual: { route: AutoRouteItem[]; metrics: RouteMetrics };
    error?: string;
    vehicleLabel: string;
  }[];
  routingParams?: GenerateTimeWindowRouteParams;
}

export interface CreateRoutingConfigRequest {
  name: string;
  country: Country;
  kitchen: Kitchen;
  time: DeliveryTime;
  enabled: boolean;
  shiftStartTime: string;
  shiftEndTime: string;
  deliveryStartTime: string;
  endAtKitchen: boolean;
  deliveryEndTime: string | null;
  avgDeliveryTime: number;
  travelDurationMultiple: number;
  windowType: WindowType;
  windowSize: number;
  lookbackDays?: number;
  customDispatchLocation: LatLng | null;
  autoAssignRoutePlans: boolean;
  simulationStartTime: string;
  zoneIds: string[];
  costModel?: {
    costPerHourAfterSoftEndTime: number;
    costPerHourBeforeSoftStartTime: number;
    globalDurationCostPerHour: number;
  };
  isDeliveryEndTimeNextDay?: boolean;
  isShiftEndTimeNextDay?: boolean;
  isSubslotTimeNextDay?: boolean;
  firstSubslotEndTime?: string;
  numberOfDrivers?: number;
}

export interface UpdateRoutingConfigRequest {
  name?: string;
  enabled?: boolean;
  shiftStartTime?: string;
  shiftEndTime?: string;
  deliveryStartTime?: string;
  endAtKitchen?: boolean;
  deliveryEndTime?: string | null;
  avgDeliveryTime?: number;
  travelDurationMultiple?: number;
  windowType?: WindowType;
  windowSize?: number;
  lookbackDays?: number;
  customDispatchLocation?: LatLng | null;
  autoAssignRoutePlans?: boolean;
  simulationStartTime?: string;
  zoneIds?: string[];
  numberOfDrivers?: number;
  costModel?: {
    costPerHourAfterSoftEndTime: number;
    costPerHourBeforeSoftStartTime: number;
    globalDurationCostPerHour: number;
  };
  isDeliveryEndTimeNextDay?: boolean;
  isShiftEndTimeNextDay?: boolean;
  isSubslotTimeNextDay?: boolean;
  firstSubslotEndTime?: string;
}

export interface RoutingConfigFilters {
  time: DeliveryTime;
  country: Country;
  kitchen: Kitchen;
}
