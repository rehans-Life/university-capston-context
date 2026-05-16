import { Country, DDeliveryStatus, DeliveryTime, ShiftActionType } from 'libs/enums';
import { LatLng, Range } from 'libs/interfaces';
import { WindowType } from '../../../libs/enums';
import { logger } from '@teamcalo/core';
import { RoutePlanEntity } from '../../../libs/entities';
import { RoutePlanRepository } from '../../../libs/repositories';
import { addDays, parseISO, subDays } from 'date-fns';
import { format } from 'date-fns/fp';
import { DeliveryRepository } from 'libs/repositories/ES';
import { calculateDistance, getRouteActionTime } from '../helper';
import { SQS } from 'libs/facades';
import {
  AutoRouteItem,
  GenerateTimeWindowRouteParams as GenerateTimeWindowRouteRequest,
  Shipment,
  TimeWindow,
  Vehicle
} from '../../../libs/interfaces';

export interface DeliveryFilters {
  ids?: string[];
  day: Range;
  deliveryTime?: DeliveryTime;
  deliveryStatus?: DDeliveryStatus;
  userIds?: string[];
}

const bufferDays = 14;
const costForLateDelivery = 1; // large cost to avoid late deliveries
const costForEarlyDelivery = 0.5; // large cost to avoid early deliveries

class GenerateTimeWindowRouteUseCase {
  constructor(
    private readonly routePlanRepository: RoutePlanRepository,
    private readonly deliveryRepository: DeliveryRepository
  ) {}
  async exec(
    id: string,
    windowType: WindowType,
    windowSize: number,
    deliveryStartTime: string,
    deliveryEndTime: string,
    avgDeliveryTime: string,
    isDeliveryEndTimeNextDay: boolean,
    isShiftEndTimeNextDay: boolean,
    isSubslotTimeNextDay: boolean,
    shiftStartTime?: string,
    shiftEndTime?: string,
    travelDurationMultiple?: number,
    dispatchLocation?: { lat: number; lng: number },
    endAtKitchen?: boolean,
    firstSubslotEndTime?: string,
    lookbackDays?: number,
    costModel?: {
      costPerHourAfterSoftEndTime: number;
      costPerHourBeforeSoftStartTime: number;
      globalDurationCostPerHour: number;
    }
  ) {
    logger.debug('GenerateTimeWindowRouteUseCase exec called with:', {
      id,
      windowType,
      windowSize,
      deliveryStartTime,
      deliveryEndTime,
      avgDeliveryTime,
      shiftStartTime,
      shiftEndTime,
      travelDurationMultiple,
      dispatchLocation,
      endAtKitchen,
      firstSubslotEndTime,
      lookbackDays,
      costModel,
      isDeliveryEndTimeNextDay,
      isShiftEndTimeNextDay,
      isSubslotTimeNextDay
    });
    if (!id || !deliveryStartTime || !deliveryEndTime || !avgDeliveryTime) {
      throw 'missing parameters';
    }

    if (!windowType) {
      windowType = WindowType.none;
    }

    if (!costModel) {
      costModel = {
        costPerHourAfterSoftEndTime: costForLateDelivery,
        costPerHourBeforeSoftStartTime: costForEarlyDelivery,
        globalDurationCostPerHour: 1
      };
    }

    windowSize = windowSize ? Number(windowSize) / 2 : 15;

    if (endAtKitchen === undefined) {
      endAtKitchen = true;
    }

    const routePlan = (await this.routePlanRepository.findById(id)) as RoutePlanEntity;
    if (!routePlan) {
      throw new Error('Route plan not found');
    }

    const kitchenLocation = {
      lat: routePlan.kitchenPosition.lat,
      lng: routePlan.kitchenPosition.lng
    };

    if (dispatchLocation) {
      kitchenLocation.lat = dispatchLocation.lat;
      kitchenLocation.lng = dispatchLocation.lng;
    }

    const day = routePlan.day;
    const nextDay = format('yyyy-MM-dd')(addDays(parseISO(day), 1));

    // from start time and end time which are iso strings, create iso strings for the day of the route plan and set seconds to 0
    const startTimeIsoString = new Date(`${day}T${deliveryStartTime.slice(11, 16)}:00.000Z`).toISOString();
    let endTimeIsoString = new Date(`${day}T${deliveryEndTime.slice(11, 16)}:00.000Z`).toISOString();
    let firstSubslotEndTimeIsoString;

    if (firstSubslotEndTime) {
      firstSubslotEndTimeIsoString = new Date(
        `${isSubslotTimeNextDay ? nextDay : day}T${firstSubslotEndTime.slice(11, 16)}:00.000Z`
      ).toISOString();
    }

    // for globalStartTime minus 1 hour from startTimeIsoString
    let globalStartTimeIsoString = new Date(new Date(startTimeIsoString).getTime() - 60 * 60 * 1000).toISOString();
    // for globalEndTime plus 30 mins from endTimeIsoString
    let globalEndTimeIsoString = new Date(new Date(endTimeIsoString).getTime() + 30 * 60 * 1000).toISOString();

    if (shiftStartTime) {
      globalStartTimeIsoString = new Date(`${day}T${shiftStartTime.slice(11, 16)}:00.000Z`).toISOString();
    }
    if (shiftEndTime) {
      globalEndTimeIsoString = new Date(
        `${isShiftEndTimeNextDay ? nextDay : day}T${shiftEndTime.slice(11, 16)}:00.000Z`
      ).toISOString();
    }

    if (isDeliveryEndTimeNextDay) {
      endTimeIsoString = new Date(`${nextDay}T${deliveryEndTime.slice(11, 16)}:00.000Z`).toISOString();
      // If no explicit shiftEndTime provided, recalculate globalEndTime based on the updated endTime
      if (!shiftEndTime) {
        globalEndTimeIsoString = new Date(new Date(endTimeIsoString).getTime() + 30 * 60 * 1000).toISOString();
      }
    }

    let routePlanStartTimeIsoString =
      getRouteActionTime(routePlan.driverActions, ShiftActionType.STARTED_DELIVERING) ?? globalStartTimeIsoString;

    logger.debug(
      `generating time window route for plan ${routePlan.sk} on day ${day} between ${startTimeIsoString} and ${endTimeIsoString} with window type ${windowType} and window size ${windowSize} minutes and avgDeliveryTime ${avgDeliveryTime} and globalStartTime ${globalStartTimeIsoString} and globalEndTime ${globalEndTimeIsoString}`
    );

    const deliveryIds = Object.keys(routePlan.routePlan);
    const lookbackWindowDays = lookbackDays == null ? bufferDays : (lookbackDays >= 0 ? lookbackDays : bufferDays);
    const deliveries = await this.prepareDeliveries(deliveryIds, lookbackWindowDays, day, routePlan);

    const deliveriesWithTimeWindows = this.attachTimeWindowsToDeliveries(
      deliveries,
      windowType,
      windowSize,
      startTimeIsoString,
      endTimeIsoString,
      routePlan,
      costModel,
      firstSubslotEndTimeIsoString
    );
    logger.debug(`deliveries with time windows: ${JSON.stringify(deliveriesWithTimeWindows, null, 2)}`);

    const vehicles = this.prepareVehicles(
      routePlan,
      kitchenLocation,
      globalStartTimeIsoString,
      globalEndTimeIsoString,
      travelDurationMultiple,
      endAtKitchen
    );

    const shipments = await this.prepareShipments(
      deliveriesWithTimeWindows,
      kitchenLocation,
      globalStartTimeIsoString,
      globalEndTimeIsoString,
      avgDeliveryTime
    );
    logger.debug(`prepared ${shipments.length} shipments for routing`, JSON.stringify(shipments, null, 2));

    const fileName = `${routePlan.sk}-${Date.now()}`;
    const response = { fileName };

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
      routePlanStartTimeIsoString,
      deliveriesWithTimeWindows,
      endAtKitchen,
      globalDurationCostPerHour: costModel?.globalDurationCostPerHour || 1,
      lookbackDays: lookbackWindowDays
    };
    logger.debug('sending routing request to SQS:', JSON.stringify(routingRequest, null, 2));
    await sqsClient.send(routingRequest as unknown as Parameters<typeof sqsClient.send>[0]);
    return response;
  }

  private async prepareDeliveries(
    deliveryIds: string[],
    bufferDays: number,
    planDay: string,
    plan: RoutePlanEntity
  ): Promise<AutoRouteItem[]> {
    // fetch deliveries
    const planDeliveriesfilters = {
      ids: deliveryIds
    };
    const planDeliveries = await this.deliveryRepository.getDeliveriesForDriverMetrics(planDeliveriesfilters);

    // for each delivery, get the userId and for that userId, get past 14 days of deliveries with the same day

    // get unique userIds from planDeliveries
    const userIds = [...new Set(planDeliveries.rows.map((d) => d.userId))];
    const userDeliveries: Record<string, { time: string; addressId: string; avgDeliveredAt?: string }> = {};

    // map userId to their delivery time and addressId in the plan
    for (const userId of userIds) {
      const planUserDelivery = planDeliveries.rows.find((d) => d.userId === userId);
      // what if a user has multiple deliveries for different addresses in the same plan?
      if (!planUserDelivery) {
        logger.debug(`no deliveries found for user ${userId} in plan ${plan.sk}, skipping`);
        continue;
      }
      userDeliveries[userId] = {
        time: planUserDelivery?.time,
        addressId: planUserDelivery?.deliveryAddress.id
      };
    }

    // for each userId, fetch historical deliveries in past bufferDays with same day and time and addressId
    const startDate = subDays(parseISO(planDay), bufferDays);
    const filters: Partial<DeliveryFilters> = {
      userIds: userIds,
      day: {
        gte: format('yyyy-MM-dd')(startDate),
        lte: planDay
      },
      deliveryStatus: DDeliveryStatus.delivered
    };
    logger.debug(`fetching historical deliveries with filters: ${JSON.stringify(filters)}`);
    const historicalDeliveries = await this.deliveryRepository.getDeliveries(filters);
    logger.debug(
      `found ${historicalDeliveries.total} historical deliveries for users ${JSON.stringify(userIds.join(', '))}`
    );

    // for each userId, calculate avg deliveredAt time from historical deliveries
    for (const userId of Object.keys(userDeliveries)) {
      const planUser = userDeliveries[userId];
      const userHistoricalDeliveries = historicalDeliveries.data.filter(
        (d) => d.userId === userId && d.time === planUser.time && d.deliveryAddress.id === planUser.addressId
      );
      if (!userHistoricalDeliveries || userHistoricalDeliveries.length < 1) {
        logger.debug(`no historical deliveries found for user ${userId}, skipping`);
        continue;
      }
      logger.debug(`found ${userHistoricalDeliveries.length} historical deliveries for user ${userId}`);

      // calculate avg deliveredAt time
      let totalMinutes = 0;
      let count = 0;
      for (const userHistoricalDelivery of userHistoricalDeliveries) {
        if (userHistoricalDelivery.deliveredAt) {
          const dateObj = new Date(userHistoricalDelivery.deliveredAt);
          const minutes = dateObj.getHours() * 60 + dateObj.getMinutes();
          totalMinutes += minutes;
          count++;
        }
      }
      if (count === 0) {
        logger.debug(`no historical deliveredAt values for user ${userId}, skipping`);
        continue;
      }
      const avgMinutes = Math.round(totalMinutes / count);
      const avgHour = Math.floor(avgMinutes / 60);
      const avgMinute = avgMinutes % 60;
      // Format as "HH:mm"
      const avgDeliveredTime = `${avgHour.toString().padStart(2, '0')}:${avgMinute.toString().padStart(2, '0')}`;
      logger.debug(`avgDeliveredTime for user ${userId}: ${avgDeliveredTime}`);
      // avgDeliveredAt is plan.day and avgDeliveredTime
      const avgDeliveredAt = new Date(`${planDay}T${avgDeliveredTime}:00.000Z`);
      userDeliveries[userId].avgDeliveredAt = avgDeliveredAt.toISOString();
    }

    // create array of deliveries to return
    const deliveriesToReturn = planDeliveries.rows.map((d) => ({
      id: d.id,
      avgDeliveredAt: userDeliveries[d.userId]?.avgDeliveredAt,
      deliveredAt: d.deliveredAt,
      deliveredLocationDistance: calculateDistance(d.deliveryAddress, plan.routePlan[d.id]?.deliveredAtLocation),
      priority: plan.routePlan[d.id]?.priority || 0,
      name: d.name,
      lat: d.deliveryAddress.lat,
      lng: d.deliveryAddress.lng,
      time: d.time
    }));
    logger.debug(`deliveriesToReturn: ${JSON.stringify(deliveriesToReturn, null, 2)}`);
    return deliveriesToReturn;
  }

  private prepareShipments(
    deliveries: AutoRouteItem[],
    kitchenLocation: LatLng,
    startTime: string,
    endTime: string,
    avgDeliveryTime: string
  ): Shipment[] {
    const pickup = {
      arrivalLocation: { latitude: kitchenLocation.lat, longitude: kitchenLocation.lng },
      timeWindows: [{ startTime: startTime, endTime: endTime }]
    };
    return deliveries.map((d) => {
      const windows: TimeWindow[] = d.timeWindows ?? [{ startTime: startTime, endTime: endTime }];
      return {
        label: d.id,
        pickups: [
          {
            ...pickup
          }
        ],
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

  private prepareVehicles(
    routePlan: RoutePlanEntity,
    kitchenLocation: LatLng,
    shiftStartTime: string,
    shiftEndTime: string,
    travelDurationMultiple: number = 1.0,
    endAtKitchen: boolean
  ): Vehicle[] {
    let vehicle: Vehicle = {
      travelMode: 'DRIVING',
      startLocation: { latitude: kitchenLocation.lat, longitude: kitchenLocation.lng },
      startTimeWindows: [
        {
          startTime: shiftStartTime,
          endTime: shiftEndTime
        }
      ],
      travelDurationMultiple: travelDurationMultiple,
      label: routePlan.driver.id
    };
    if (endAtKitchen) {
      vehicle = {
        ...vehicle,
        endLocation: { latitude: kitchenLocation.lat, longitude: kitchenLocation.lng }
      };
    }
    return [vehicle];
  }

  private attachTimeWindowsToDeliveries(
    deliveries: AutoRouteItem[],
    windowType: WindowType,
    windowSize: number,
    startTime: string,
    endTime: string,
    routePlan: RoutePlanEntity,
    costModel: {
      costPerHourAfterSoftEndTime: number;
      costPerHourBeforeSoftStartTime: number;
      globalDurationCostPerHour: number;
    },
    firstSubslotEndTime?: string
  ): AutoRouteItem[] {
    return deliveries.map((d) => {
      // special case for GB evening deliveries
      if (routePlan.country === Country.GB && routePlan.time === DeliveryTime.evening) {
        if (d.time === DeliveryTime.evening && firstSubslotEndTime) {
          // create hard time windows from startTime to firstSubslotEndTime
          const timeWindows = this.createTimeWindows(
            costModel,
            WindowType.hard,
            windowSize,
            startTime,
            firstSubslotEndTime
          );
          return {
            ...d,
            timeWindows
          };
        } else {
          // create soft time windows from startTime to endTime
          const timeWindows = this.createTimeWindows(costModel, windowType, windowSize, startTime, endTime);
          return {
            ...d,
            timeWindows
          };
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
        return {
          ...d,
          timeWindows
        };
      }
    });
  }

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
      case WindowType.soft: {
        return [
          {
            softStartTime: windowStartTime,
            softEndTime: windowEndTime,
            costPerHourAfterSoftEndTime: costModel.costPerHourAfterSoftEndTime,
            costPerHourBeforeSoftStartTime: costModel.costPerHourBeforeSoftStartTime
          }
        ];
      }
      case WindowType.hard: {
        return [
          {
            startTime: windowStartTime,
            endTime: windowEndTime
          }
        ];
      }
      default: {
        return [
          {
            startTime: startTime,
            endTime: endTime
          }
        ];
      }
    }
  }
}

export default GenerateTimeWindowRouteUseCase;
