import { Country, DDeliveryStatus, DeliveryTime, Kitchen, WindowType, DataType } from 'libs/enums';
import { logger } from '@teamcalo/core';
import { addDays, getDay, parseISO, subDays } from 'date-fns';
import { format } from 'date-fns/fp';
import { LatLng, Range, DeliveryForRouteGeneration } from 'libs/interfaces';
import { DeliveryRepository } from 'libs/repositories/ES/DeliveryRepository';
import { SQS } from 'libs/facades';
import {
  AutoRouteItem,
  GenerateTimeWindowRouteParams as GenerateTimeWindowRouteRequest,
  Shipment,
  TimeWindow,
  Vehicle
} from '../../../libs/interfaces';
import { RoutingConfigRepository } from '../../../libs/repositories';
import { KitchenRepository, MapRepository } from 'libs/repositories/DDB';
import { RoutingConfigEntity } from 'libs/entities/DDB/RoutingConfigEntity';
import { DynamicRoutingService } from 'libs/services/DynamicRoutingService';
import { fetchAndMergeDeliveries } from './deliveryHelper';
import ValidationError from 'libs/errors/ValidationError';

export interface DeliveryFilters {
  ids?: string[];
  day: Range;
  deliveryTime?: DeliveryTime;
  deliveryStatus?: DDeliveryStatus;
  userIds?: string[];
}

/**
 * Input parameters for generating dynamic routing from a routing config
 */
export interface GenerateDynamicRoutingParams {
  routingConfigID: string;
  day: string;
}

/**
 * Internal parameters for time window route generation (used after config processing)
 */
interface TimeWindowRouteParams {
  deliveryIds: string[];
  driverIds: string[];
  country: Country;
  kitchen: Kitchen;
  day: string;
  deliveryTime: DeliveryTime;
  routingConfigName: string;
  numberOfDrivers?: number;
  windowType: WindowType;
  windowSize: number;
  lookbackDays?: number;
  deliveryStartTime: string;
  deliveryEndTime: string;
  avgDeliveryTime: string;
  isDeliveryEndTimeNextDay: boolean;
  isShiftEndTimeNextDay: boolean;
  isSubslotTimeNextDay: boolean;
  shiftStartTime: string;
  shiftEndTime: string;
  travelDurationMultiple: number;
  dispatchLocation: { lat: number; lng: number };
  endAtKitchen: boolean;
  firstSubslotEndTime?: string;
  costModel?: {
    costPerHourAfterSoftEndTime: number;
    costPerHourBeforeSoftStartTime: number;
    globalDurationCostPerHour: number;
  };
}

const bufferDays = 14;
const costForLateDelivery = 1; // large cost to avoid late deliveries
const costForEarlyDelivery = 0.5; // large cost to avoid early deliveries

/**
 * Use Case for generating dynamic routes from a routing configuration.
 *
 * This use case:
 * 1. Fetches the routing config by ID
 * 2. Extracts driver IDs from the config's zones
 * 3. Fetches and merges deliveries with donations
 * 4. Evaluates which deliveries are eligible for dynamic routing
 * 5. Generates time-windowed routes for multiple drivers
 */

class GenerateDynamicRoutingUseCase {
  private readonly mapRepository: MapRepository;
  private readonly routingConfigRepository: RoutingConfigRepository;
  private readonly kitchenRepository: KitchenRepository;

  constructor(private readonly deliveryRepository: DeliveryRepository) {
    this.mapRepository = new MapRepository();
    this.routingConfigRepository = new RoutingConfigRepository();
    this.kitchenRepository = new KitchenRepository();
  }

  /**
   * Main entry point - generates dynamic routing from a routing config ID and day.
   */
  async exec(params: GenerateDynamicRoutingParams): Promise<{ fileName: string }> {
    const { routingConfigID, day } = params;

    logger.info('Starting generation', { routingConfigID, day });

    // Step 1: Fetch routing config (Currently not filtering based on enabled flag)
    const config = await this.routingConfigRepository.getRoutingConfig(routingConfigID);
    if (!config) {
      throw new ValidationError(`Routing config not found: ${routingConfigID}`, 404);
    }

    logger.info('Config loaded', {
      name: config.name,
      kitchen: config.kitchen,
      country: config.country,
      time: config.time,
      zoneIds: config.zoneIds
    });

    // Step 2: Get driver IDs from routing config's zones, then find ALL zones those drivers serve
    const map = await this.mapRepository.find({
      id: `${DataType.map}#${config.country}`,
      sk: `${config.kitchen}#${config.time}`
    });

    if (!map) {
      throw new ValidationError(`Map not found for ${config.kitchen}/${config.time}`, 404);
    }

    if (config.zoneIds.length === 0) {
      throw new ValidationError('No zone IDs specified in the routing config', 400);
    }

    // Filter delivery areas by the zones in the routing config to get initial drivers
    const configDeliveryAreas = map.deliveryAreas?.filter((area) => area.id && config.zoneIds.includes(area.id));
    if (!configDeliveryAreas || configDeliveryAreas.length === 0) {
      throw new ValidationError('No matching delivery areas found for the provided zone IDs', 400);
    }

    // `day` is the route-plan day.
    // For GB evening bundles, the plan combines previous-day evening with route-plan-day early morning,
    // so evening driver assignments are keyed using day-1.
    const parsedDay = parseISO(day);
    const effectiveDay = config.time === DeliveryTime.evening ? subDays(parsedDay, 1) : parsedDay;

    // Get the effective day number (0 = Sunday, 6 = Saturday) for driver extraction.
    const dayNumber = getDay(effectiveDay);
    const nextDayNumber = getDay(addDays(effectiveDay, 1));

    // Extract unique driver IDs for the specific day from config zones
    const driverIds = [
      ...new Set(configDeliveryAreas.map((area) => area.drivers?.[dayNumber]).filter((id): id is string => !!id))
    ];

    if (driverIds.length === 0) {
      throw new ValidationError(`No drivers assigned to zones for day ${day} (day number: ${dayNumber})`, 400);
    }

    logger.info('Drivers extracted from config zones', {
      dayNumber: dayNumber,
      driversCount: driverIds.length,
      configZonesCount: configDeliveryAreas.length
    });

    // For GB evening bundles, next-day early-morning deliveries are only eligible
    // for drivers that exist across configured zones on both days (today/tomorrow),
    // even if they are assigned to different zones.
    let nextDayEligibleDriverIds: string[] | undefined;
    if (config.country === Country.GB && config.time === DeliveryTime.evening) {
      const nextDayConfigDriverIds = new Set(
        configDeliveryAreas.map((area) => area.drivers?.[nextDayNumber]).filter((id): id is string => !!id)
      );
      nextDayEligibleDriverIds = driverIds.filter((driverId) => nextDayConfigDriverIds.has(driverId));

      logger.info('Next-day eligible drivers derived from configured zones', {
        todayDrivers: driverIds,
        nextDayDrivers: [...nextDayConfigDriverIds],
        overlappingDrivers: nextDayEligibleDriverIds
      });
    }

    // Now find ALL zones that these drivers serve (not just config zones)
    const allDriverZoneIds = new Set<string>();
    for (const area of map.deliveryAreas ?? []) {
      const areaDriverId = area.drivers?.[dayNumber];
      if (areaDriverId && driverIds.includes(areaDriverId) && area.id) {
        allDriverZoneIds.add(area.id);
      }
    }

    logger.info('All zones for drivers found', {
      configZoneIds: config.zoneIds,
      allDriverZoneIds: [...allDriverZoneIds],
      additionalZones: [...allDriverZoneIds].filter((id) => !config.zoneIds.includes(id))
    });

    // Step 3: Fetch deliveries and donations, then merge them
    const { extendedDeliveries } = await fetchAndMergeDeliveries({
      day,
      kitchen: config.kitchen,
      deliveryTime: config.time,
      country: config.country
    });

    logger.info('Deliveries fetched', {
      deliveriesCount: extendedDeliveries.length
    });

    if (extendedDeliveries.length === 0) {
      throw new ValidationError('No deliveries found for the given day and kitchen', 400);
    }

    // Step 4: Evaluate deliveries for dynamic routing eligibility using ALL driver zones
    // Create a plain object with all driver zone IDs for the routing evaluation
    const expandedRoutingConfig = {
      id: config.id,
      sk: config.sk,
      name: config.name,
      country: config.country,
      kitchen: config.kitchen,
      time: config.time,
      zoneIds: [...allDriverZoneIds], // Use ALL zones that drivers serve, not just config zones
      enabled: config.enabled,
      shiftStartTime: config.shiftStartTime,
      shiftEndTime: config.shiftEndTime,
      deliveryStartTime: config.deliveryStartTime,
      deliveryEndTime: config.deliveryEndTime,
      avgDeliveryTime: config.avgDeliveryTime,
      windowType: config.windowType,
      windowSize: config.windowSize,
      isDeliveryEndTimeNextDay: config.isDeliveryEndTimeNextDay,
      isShiftEndTimeNextDay: config.isShiftEndTimeNextDay,
      isSubslotTimeNextDay: config.isSubslotTimeNextDay,
      travelDurationMultiple: config.travelDurationMultiple,
      customDispatchLocation: config.customDispatchLocation,
      endAtKitchen: config.endAtKitchen,
      firstSubslotEndTime: config.firstSubslotEndTime,
      costModel: config.costModel
    };

    const maps = await this.mapRepository.getAllForKitchen(config.kitchen as Kitchen);
    const dynamicRoutingService = new DynamicRoutingService();
    const { dynamicRoutedDeliveries, skippedCount } = dynamicRoutingService.evaluateDeliveriesForDynamicRouting({
      deliveries: extendedDeliveries as DeliveryForRouteGeneration[],
      routingConfig: expandedRoutingConfig as RoutingConfigEntity,
      maps,
      day,
      driverIds,
      nextDayEligibleDriverIds
    });

    logger.info('Deliveries evaluated', {
      eligible: dynamicRoutedDeliveries.length,
      skipped: skippedCount
    });

    // Extract delivery IDs for routing
    const deliveryIds = dynamicRoutedDeliveries.map((d) => d.id);

    if (deliveryIds.length === 0) {
      throw new ValidationError('No deliveries matched the routing config zones', 400);
    }

    // Step 5: Get dispatch location (custom dispatch location or kitchen location)
    let dispatchLocation = config.customDispatchLocation;
    if (!dispatchLocation) {
      const kitchenEntity = await this.kitchenRepository.findById(config.kitchen as Kitchen);
      if (!kitchenEntity?.location) {
        throw new ValidationError(`Kitchen location not found for kitchen: ${config.kitchen}`, 404);
      }
      dispatchLocation = kitchenEntity.location;
    }

    // Step 6: Generate time-windowed routes
    const fileName = await this.generateTimeWindowRoutes({
      deliveryIds,
      driverIds,
      country: config.country as Country,
      kitchen: config.kitchen as Kitchen,
      day,
      deliveryTime: config.time as DeliveryTime,
      routingConfigName: config.name,
      numberOfDrivers: config.numberOfDrivers,
      windowType: config.windowType,
      windowSize: config.windowSize,
      lookbackDays: config.lookbackDays,
      deliveryStartTime: config.deliveryStartTime,
      deliveryEndTime: config.deliveryEndTime ?? config.deliveryStartTime,
      avgDeliveryTime: `${config.avgDeliveryTime}s`,
      isDeliveryEndTimeNextDay: config.isDeliveryEndTimeNextDay,
      isShiftEndTimeNextDay: config.isShiftEndTimeNextDay,
      isSubslotTimeNextDay: config.isSubslotTimeNextDay,
      shiftStartTime: config.shiftStartTime,
      shiftEndTime: config.shiftEndTime,
      travelDurationMultiple: config.travelDurationMultiple,
      dispatchLocation,
      endAtKitchen: config.endAtKitchen,
      firstSubslotEndTime: config.firstSubslotEndTime,
      costModel: config.costModel
    });

    logger.info('Route generation complete', { fileName });

    return {
      fileName
    };
  }

  /**
   * Generates time-windowed routes for multiple drivers.
   */
  private async generateTimeWindowRoutes(params: TimeWindowRouteParams): Promise<string> {
    const {
      deliveryIds,
      driverIds,
      country,
      kitchen,
      day,
      deliveryTime,
      routingConfigName,
      numberOfDrivers,
      windowType,
      deliveryStartTime,
      deliveryEndTime,
      avgDeliveryTime,
      lookbackDays,
      isDeliveryEndTimeNextDay = false,
      isShiftEndTimeNextDay = false,
      isSubslotTimeNextDay = false,
      shiftStartTime,
      shiftEndTime,
      travelDurationMultiple = 1.0,
      dispatchLocation,
      endAtKitchen = true,
      firstSubslotEndTime,
      costModel
    } = params;

    let { windowSize } = params;
    const originalWindowSize = windowSize ?? 30; // default fallback
    windowSize = windowSize == null ? 15 : windowSize <= 0 ? 0 : windowSize / 2;

    logger.info('Generating time window routes', {
      deliveries: deliveryIds.length,
      drivers: driverIds.length,
      country,
      day,
      deliveryTime
    });

    const effectiveCostModel = costModel ?? {
      costPerHourAfterSoftEndTime: costForLateDelivery,
      costPerHourBeforeSoftStartTime: costForEarlyDelivery,
      globalDurationCostPerHour: 1
    };

    if (!dispatchLocation) {
      throw new ValidationError('Routing config must have a dispatch location configured', 400);
    }
    // Kitchen location from dispatch location
    const kitchenLocation: LatLng = {
      lat: dispatchLocation.lat,
      lng: dispatchLocation.lng
    };

    const previousDay = format('yyyy-MM-dd')(subDays(parseISO(day), 1));

    // For evening routes, `day` is the route-plan day (ES day = deliveryDay + 1).
    // Time windows must use the actual delivery day (day - 1) so that:
    //   - evening start times fall on the correct calendar date (e.g. 17th for day=18)
    //   - isDeliveryEndTimeNextDay/isShiftEndTimeNextDay correctly push end times to `day` itself (18th)
    const timeBaseDay = deliveryTime === DeliveryTime.evening ? previousDay : day;
    const timeBaseNextDay = format('yyyy-MM-dd')(addDays(parseISO(timeBaseDay), 1));

    // Calculate time windows
    const startTimeIsoString = new Date(`${timeBaseDay}T${deliveryStartTime.slice(11, 16)}:00.000Z`).toISOString();
    let endTimeIsoString = new Date(`${timeBaseDay}T${deliveryEndTime.slice(11, 16)}:00.000Z`).toISOString();
    let firstSubslotEndTimeIsoString: string | undefined;

    if (firstSubslotEndTime) {
      firstSubslotEndTimeIsoString = new Date(
        `${isSubslotTimeNextDay ? timeBaseNextDay : timeBaseDay}T${firstSubslotEndTime.slice(11, 16)}:00.000Z`
      ).toISOString();
    }

    // Calculate global start/end times (shift times)
    let globalStartTimeIsoString = new Date(new Date(startTimeIsoString).getTime() - 60 * 60 * 1000).toISOString();
    let globalEndTimeIsoString = new Date(new Date(endTimeIsoString).getTime() + 30 * 60 * 1000).toISOString();

    if (shiftStartTime) {
      globalStartTimeIsoString = new Date(`${timeBaseDay}T${shiftStartTime.slice(11, 16)}:00.000Z`).toISOString();
    }
    if (shiftEndTime) {
      globalEndTimeIsoString = new Date(
        `${isShiftEndTimeNextDay ? timeBaseNextDay : timeBaseDay}T${shiftEndTime.slice(11, 16)}:00.000Z`
      ).toISOString();
    }

    if (isDeliveryEndTimeNextDay) {
      endTimeIsoString = new Date(`${timeBaseNextDay}T${deliveryEndTime.slice(11, 16)}:00.000Z`).toISOString();
      if (!shiftEndTime) {
        globalEndTimeIsoString = new Date(new Date(endTimeIsoString).getTime() + 30 * 60 * 1000).toISOString();
      }
    }

    logger.info('Time windows calculated', {
      startTime: startTimeIsoString,
      endTime: endTimeIsoString,
      windowType,
      windowSize
    });

    // Step 1: Prepare deliveries
    const lookbackWindowDays = lookbackDays == null ? bufferDays : (lookbackDays >= 0 ? lookbackDays : bufferDays);
    const deliveries = await this.prepareDeliveries(deliveryIds, lookbackWindowDays, day, country);
    // Step 2: Attach time windows to deliveries
    const deliveriesWithTimeWindows = this.attachTimeWindowsToDeliveries(
      deliveries,
      windowType,
      windowSize,
      startTimeIsoString,
      endTimeIsoString,
      country,
      deliveryTime,
      effectiveCostModel,
      firstSubslotEndTimeIsoString
    );

    // Step 3: Prepare vehicles (one per driver)
    const vehicles = this.prepareVehicles(
      driverIds,
      kitchenLocation,
      globalStartTimeIsoString,
      globalEndTimeIsoString,
      travelDurationMultiple,
      endAtKitchen,
      numberOfDrivers ?? undefined
    );

    // Step 4: Prepare shipments
    const shipments = this.prepareShipments(
      deliveriesWithTimeWindows,
      kitchenLocation,
      globalStartTimeIsoString,
      globalEndTimeIsoString,
      avgDeliveryTime
    );

    logger.info('Route data prepared', {
      shipments: shipments.length,
      vehicles: vehicles.length
    });

    // Step 5: Generate unique filename
    const fileName = `${kitchen}-${routingConfigName}-${day}-${deliveryTime}-${new Date().toISOString()}`;

    // Step 6: Send to SQS for routing
    const sqsClient = new SQS(process.env.TIME_WINDOW_QUEUE_URL!);
    const routingRequest: GenerateTimeWindowRouteRequest = {
      fileName,
      shipments,
      vehicles,
      startTimeIsoString: globalStartTimeIsoString,
      endTimeIsoString: globalEndTimeIsoString,
      deliveryStartTimeIsoString: startTimeIsoString,
      deliveryEndTimeIsoString: endTimeIsoString,
      windowType,
      kitchenLocation,
      routePlanStartTimeIsoString: globalStartTimeIsoString,
      deliveriesWithTimeWindows,
      endAtKitchen,
      globalDurationCostPerHour: effectiveCostModel.globalDurationCostPerHour,
      travelDurationMultiple,
      windowSize: originalWindowSize,
      lookbackDays: lookbackWindowDays,
      averageDeliveryTime: parseInt(avgDeliveryTime, 10), // parse "30s" → 30 seconds
      shiftEndTime: globalEndTimeIsoString,
      firstSubslotEndTime: firstSubslotEndTimeIsoString,
      costModel: effectiveCostModel,
      isDeliveryEndTimeNextDay,
      isShiftEndTimeNextDay,
      isSubslotTimeNextDay,
      kitchen,
      country,
      time: deliveryTime
    };

    logger.info('Sending to SQS', { fileName });
    await sqsClient.send(routingRequest as unknown as Parameters<typeof sqsClient.send>[0]);

    return fileName;
  }

  /**
   * Prepares delivery objects from delivery IDs.
   */
  private async prepareDeliveries(
    deliveryIds: string[],
    bufferDays: number,
    planDay: string,
    country: Country
  ): Promise<AutoRouteItem[]> {
    logger.info('Preparing deliveries', { count: deliveryIds.length, country });

    // Fetch deliveries by IDs
    const planDeliveriesFilters = { ids: deliveryIds };
    const planDeliveries = await this.deliveryRepository.getDeliveriesForDriverMetrics(planDeliveriesFilters);

    if (!planDeliveries.rows.length) {
      logger.warn('No deliveries found for provided IDs');
      return [];
    }

    logger.info('Deliveries retrieved from ES', { count: planDeliveries.rows.length });

    // Get unique userIds for historical delivery lookup
    const userIds = [...new Set(planDeliveries.rows.map((d) => d.userId))];
    const userDeliveries: Record<string, { time: string; addressId: string; avgDeliveredAt?: string }> = {};

    // Map userId to their delivery time and addressId
    for (const userId of userIds) {
      const planUserDelivery = planDeliveries.rows.find((d) => d.userId === userId);
      if (!planUserDelivery) {
        continue;
      }
      userDeliveries[userId] = {
        time: planUserDelivery.time,
        addressId: planUserDelivery.deliveryAddress.id
      };
    }

    // Fetch historical deliveries for average delivered-at calculation
    const startDate = subDays(parseISO(planDay), bufferDays);
    const filters: Partial<DeliveryFilters> = {
      userIds,
      day: {
        gte: format('yyyy-MM-dd')(startDate),
        lte: planDay
      },
      deliveryStatus: DDeliveryStatus.delivered
    };

    const historicalDeliveries = await this.deliveryRepository.getDeliveries(filters);
    logger.info('Historical deliveries retrieved', { count: historicalDeliveries.total });

    // Calculate average deliveredAt time for each user
    for (const userId of Object.keys(userDeliveries)) {
      const planUser = userDeliveries[userId];
      const userHistoricalDeliveries = historicalDeliveries.data.filter(
        (d) => d.userId === userId && d.time === planUser.time && d.deliveryAddress.id === planUser.addressId
      );

      if (!userHistoricalDeliveries.length) {
        continue;
      }

      // Calculate average deliveredAt time
      let totalMinutes = 0;
      let count = 0;
      for (const delivery of userHistoricalDeliveries) {
        if (delivery.deliveredAt) {
          const dateObj = new Date(delivery.deliveredAt);
          const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();
          totalMinutes += minutes;
          count++;
        }
      }

      if (count > 0) {
        const avgMinutes = Math.round(totalMinutes / count);
        const avgHour = Math.floor(avgMinutes / 60);
        const avgMinute = avgMinutes % 60;
        const avgDeliveredTime = `${avgHour.toString().padStart(2, '0')}:${avgMinute.toString().padStart(2, '0')}`;
        const avgDeliveredAt = new Date(`${planDay}T${avgDeliveredTime}:00.000Z`);
        userDeliveries[userId].avgDeliveredAt = avgDeliveredAt.toISOString();
      }
    }

    // Create array of delivery objects
    const deliveriesToReturn = planDeliveries.rows.map((d, index) => ({
      id: d.id,
      avgDeliveredAt: userDeliveries[d.userId]?.avgDeliveredAt,
      deliveredAt: d.deliveredAt,
      deliveredLocationDistance: 0,
      priority: index,
      name: d.name,
      lat: d.deliveryAddress.lat,
      lng: d.deliveryAddress.lng,
      time: d.time
    }));

    logger.info('Deliveries prepared with time windows', { count: deliveriesToReturn.length });
    return deliveriesToReturn;
  }

  /**
   * Prepares vehicle objects for each driver.
   */
  private prepareVehicles(
    driverIds: string[],
    kitchenLocation: LatLng,
    shiftStartTime: string,
    shiftEndTime: string,
    travelDurationMultiple: number = 1.0,
    endAtKitchen: boolean = true,
    numberOfDrivers?: number
  ): Vehicle[] {
    if (numberOfDrivers !== undefined) {
      const validatedNumberOfDrivers = Math.min(
        driverIds.length,
        Math.max(0, Number.isFinite(numberOfDrivers) ? Math.floor(numberOfDrivers) : 0)
      );
      driverIds = driverIds.slice(0, validatedNumberOfDrivers);
    }

    return driverIds.map((driverId) => {
      let vehicle: Vehicle = {
        travelMode: 'DRIVING',
        startLocation: { latitude: kitchenLocation.lat, longitude: kitchenLocation.lng },
        startTimeWindows: [
          {
            startTime: shiftStartTime,
            endTime: shiftEndTime
          }
        ],
        travelDurationMultiple,
        label: driverId
      };

      if (endAtKitchen) {
        vehicle = {
          ...vehicle,
          endLocation: { latitude: kitchenLocation.lat, longitude: kitchenLocation.lng }
        };
      }

      return vehicle;
    });
  }

  /**
   * Prepares shipment objects for the routing API.
   */
  private prepareShipments(
    deliveries: AutoRouteItem[],
    kitchenLocation: LatLng,
    startTime: string,
    endTime: string,
    avgDeliveryTime: string
  ): Shipment[] {
    const pickup = {
      arrivalLocation: { latitude: kitchenLocation.lat, longitude: kitchenLocation.lng },
      timeWindows: [{ startTime, endTime }]
    };

    return deliveries.map((d) => {
      const windows: TimeWindow[] = d.timeWindows ?? [{ startTime, endTime }];
      return {
        label: d.id,
        pickups: [{ ...pickup }],
        deliveries: [
          {
            arrivalLocation: {
              latitude: d.lat,
              longitude: d.lng
            },
            timeWindows: windows,
            duration: avgDeliveryTime
          }
        ]
      };
    });
  }

  /**
   * Attaches time windows to each delivery based on configuration.
   */
  private attachTimeWindowsToDeliveries(
    deliveries: AutoRouteItem[],
    windowType: WindowType,
    windowSize: number,
    startTime: string,
    endTime: string,
    country: Country,
    deliveryTime: DeliveryTime,
    costModel: {
      costPerHourAfterSoftEndTime: number;
      costPerHourBeforeSoftStartTime: number;
      globalDurationCostPerHour: number;
    },
    firstSubslotEndTime?: string
  ): AutoRouteItem[] {
    return deliveries.map((d) => {
      // Special case for GB evening deliveries
      if (country === Country.GB && deliveryTime === DeliveryTime.evening) {
        if (d.time === DeliveryTime.evening && firstSubslotEndTime) {
          // Create hard time windows from startTime to firstSubslotEndTime
          const timeWindows = this.createTimeWindows(
            costModel,
            WindowType.hard,
            windowSize,
            startTime,
            firstSubslotEndTime
          );
          return { ...d, timeWindows };
        } else {
          // Create soft time windows from startTime to endTime
          const timeWindows = this.createTimeWindows(costModel, windowType, windowSize, startTime, endTime);
          return { ...d, timeWindows };
        }
      } else {
        const timeWindows = this.createTimeWindows(
          costModel,
          windowType,
          windowSize,
          startTime,
          endTime,
          d.avgDeliveredAt
        );
        return { ...d, timeWindows };
      }
    });
  }

  /**
   * Creates time window objects based on window type.
   */
  private createTimeWindows(
    costModel: {
      costPerHourAfterSoftEndTime: number;
      costPerHourBeforeSoftStartTime: number;
      globalDurationCostPerHour: number;
    },
    windowType: WindowType,
    windowSize: number,
    startTime: string,
    endTime: string,
    avgDeliveredAt?: string
  ): TimeWindow[] {
    const avgDeliveredAtIsoString = avgDeliveredAt ? new Date(avgDeliveredAt).toISOString() : null;

    let windowStartTime = avgDeliveredAtIsoString
      ? new Date(new Date(avgDeliveredAtIsoString).getTime() - windowSize * 60000).toISOString()
      : startTime;

    if (windowStartTime < startTime || windowStartTime > endTime) {
      windowStartTime = startTime;
    }

    let windowEndTime = avgDeliveredAtIsoString
      ? new Date(new Date(avgDeliveredAtIsoString).getTime() + windowSize * 60000).toISOString()
      : endTime;

    if (windowEndTime > endTime || windowEndTime < startTime) {
      windowEndTime = endTime;
    }

    switch (windowType) {
      case WindowType.soft:
        return [
          {
            softStartTime: windowStartTime,
            softEndTime: windowEndTime,
            costPerHourAfterSoftEndTime: costModel.costPerHourAfterSoftEndTime,
            costPerHourBeforeSoftStartTime: costModel.costPerHourBeforeSoftStartTime
          }
        ];
      case WindowType.hard:
        return [
          {
            startTime: windowStartTime,
            endTime: windowEndTime
          }
        ];
      default:
        return [
          {
            startTime,
            endTime
          }
        ];
    }
  }
}

export default GenerateDynamicRoutingUseCase;
