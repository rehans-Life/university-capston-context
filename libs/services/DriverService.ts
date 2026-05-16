import { cloneDeep, flatten, groupBy, keyBy } from 'lodash';
import { DriverRepository } from '../repositories';
import { DeliveryTime, Kitchen as KitchenEnum } from 'libs/enums';
import {
  CustomInvoiceCodes,
  DeliveriesCountPerDriverByPcPerTime,
  DeliveryForRouteGeneration,
  Dictionary,
  Driver,
  ExtraDeliveryData,
  RouteGenerationProps,
  Kitchen
} from 'libs/interfaces';
import { RoutePlanWriteBatch } from '../interfaces';

import { RoutePlanServiceService } from './RoutePlanService';
import { MapRepository } from 'libs/repositories/DDB';
import { multiPolygon, point, polygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { findPostalCodeInNationwideArea, isPostalCodeInArea, cleanDeliveryPostalCode } from 'libs/utils';
import { MapEntity } from 'libs/entities/DDB';
import { logger } from '@teamcalo/core';

export class DriverService {
  public static incrementDriverDeliveriesCount(
    deliveriesCountByDriver: DeliveriesCountPerDriverByPcPerTime,
    deliveriesForDriver: DeliveryForRouteGeneration[],
    drivers: Record<string, Driver>,
    driverId: string,
    time: DeliveryTime
  ): DeliveriesCountPerDriverByPcPerTime {
    const deliveriesCountByDriverCopy = cloneDeep(deliveriesCountByDriver);
    const deliveriesForDriverByPC = groupBy(
      deliveriesForDriver,
      (d) => d.areaPostalCode ?? d.deliveryAddress.postalCode ?? 'NO_PC'
    );

    if (deliveriesForDriver.length > 0) {
      const driver = drivers[driverId];
      if (!driver) {
        return deliveriesCountByDriverCopy;
      }
      deliveriesCountByDriverCopy[driverId] = deliveriesCountByDriverCopy[driverId] ?? {};
      for (const [postalCode, deliveriesForDriverAndPC] of Object.entries(deliveriesForDriverByPC)) {
        deliveriesCountByDriverCopy[driverId][postalCode] = deliveriesCountByDriverCopy[driverId][postalCode] ?? {};
        deliveriesCountByDriverCopy[driverId][postalCode][time] =
          (deliveriesCountByDriverCopy[driverId][postalCode][time] ?? 0) + deliveriesForDriverAndPC.length;
      }
    }

    return deliveriesCountByDriverCopy;
  }

  public static calculateDeliveriesCountPerDriverByPcPerTime(
    deliveries: DeliveryForRouteGeneration[],
    drivers: Record<string, Driver>,
    maps: MapEntity[],
    day: string,
    kitchenId: KitchenEnum
  ): DeliveriesCountPerDriverByPcPerTime {
    let deliveriesCountPerDriverByPCAndTime: DeliveriesCountPerDriverByPcPerTime = {};
    if (kitchenId === KitchenEnum.GB1) {
      for (const time of Object.values(DeliveryTime)) {
        const weekDayNumber = new Date(day).getDay();
        const deliveriesByTime = deliveries.filter((d) => d.time === time);
        const map = maps.find((m) => m.deliveryTime === time);
        if (!map) {
          continue;
        }
        const nationwideAreas = (map?.nationwideAreas ?? []).filter((area) => !!area.drivers?.[weekDayNumber]);
        const deliveryAreas = (map.deliveryAreas ?? []).filter((area) => !!area.drivers?.[weekDayNumber]);
        const areas = groupBy(deliveryAreas, (area) => area.drivers[weekDayNumber]);
        let matchedDeliveryIds: string[] = [];

        if (nationwideAreas.length > 0) {
          for (const area of nationwideAreas) {
            const driver = drivers[area.drivers[weekDayNumber]];
            if (driver) {
              const nationwideDeliveriesForDriver = deliveriesByTime
                .filter((d) => d.deliveryAddress.postalCode)
                .filter((d) => isPostalCodeInArea(d.deliveryAddress.postalCode, area.postCodes));

              for (const delivery of nationwideDeliveriesForDriver) {
                const nationwidePostCode = findPostalCodeInNationwideArea(
                  delivery.deliveryAddress.postalCode,
                  area.postCodes
                );
                const cleanedDeliveryPostalCode = cleanDeliveryPostalCode(
                  nationwidePostCode ?? '',
                  delivery.deliveryAddress.postalCode?.trim() ?? ''
                );
                delivery.areaPostalCode = cleanedDeliveryPostalCode;
              }

              deliveriesCountPerDriverByPCAndTime = this.incrementDriverDeliveriesCount(
                deliveriesCountPerDriverByPCAndTime,
                nationwideDeliveriesForDriver,
                drivers,
                area.drivers[weekDayNumber],
                time
              );
            }
          }
        }

        for (const delivery of deliveries) {
          const deliveryAreaByPostCode = deliveryAreas.find(
            (area) => area.postCodes?.length && isPostalCodeInArea(delivery.deliveryAddress.postalCode, area.postCodes)
          );
          const areasWithPolygons = deliveryAreas.map((area) => ({
            area,
            polygon: polygon([[...area.bounds.map((b) => [b.lng, b.lat]), [area.bounds[0].lng, area.bounds[0].lat]]])
          }));
          const deliveryAreaByPolygon = areasWithPolygons.find(({ polygon }) =>
            booleanPointInPolygon(point([delivery.deliveryAddress.lng, delivery.deliveryAddress.lat]), polygon)
          );

          delivery.areaPostalCode = cleanDeliveryPostalCode(
            deliveryAreaByPostCode?.postCodes?.[0] ?? deliveryAreaByPolygon?.area?.postCodes?.[0] ?? '',
            delivery.deliveryAddress.postalCode?.trim() ?? ''
          );
        }

        for (const [driverId, driverAreas] of Object.entries(areas)) {
          const postalCodesForDriver = (driverAreas ?? []).flatMap((area) => area.postCodes ?? []);
          const deliveriesForDriver = deliveriesByTime.filter(
            (d) => postalCodesForDriver.length && isPostalCodeInArea(d.deliveryAddress.postalCode, postalCodesForDriver)
          );

          matchedDeliveryIds.push(...deliveriesForDriver.map((d) => d.sk));

          deliveriesCountPerDriverByPCAndTime = this.incrementDriverDeliveriesCount(
            deliveriesCountPerDriverByPCAndTime,
            deliveriesForDriver,
            drivers,
            driverId,
            time
          );
        }

        for (const [driverId, driverAreas] of Object.entries(areas)) {
          const areas = multiPolygon(
            driverAreas.map((area) => [
              [...area.bounds.map((b) => [b.lng, b.lat]), [area.bounds[0].lng, area.bounds[0].lat]]
            ])
          );
          const deliveriesForDriver = deliveriesByTime.filter(
            (d) =>
              booleanPointInPolygon(point([d.deliveryAddress.lng, d.deliveryAddress.lat]), areas) &&
              !matchedDeliveryIds.includes(d.sk)
          );

          matchedDeliveryIds.push(...deliveriesForDriver.map((d) => d.sk));

          deliveriesCountPerDriverByPCAndTime = this.incrementDriverDeliveriesCount(
            deliveriesCountPerDriverByPCAndTime,
            deliveriesForDriver,
            drivers,
            driverId,
            time
          );
        }
      }
    }
    return deliveriesCountPerDriverByPCAndTime;
  }

  public static async assignDriversToDeliveries(
    day: string,
    kitchen: Kitchen,
    isPreview: boolean,
    deliveries: DeliveryForRouteGeneration[]
  ) {
    logger.info(`Assigning drivers to ${deliveries.length} deliveries for kitchen ${kitchen.id} on ${day}`);
    const mapRepository = new MapRepository();
    const maps = await mapRepository.getAllForKitchen(kitchen.id as KitchenEnum);
    const drivers = await DriverService.getDriversMap();
    const times = [DeliveryTime.morning, DeliveryTime.evening, DeliveryTime.earlyMorning];

    const ukInvoiceCodes: CustomInvoiceCodes = {};
    const deliveriesCountPerDriverByPCAndTime: DeliveriesCountPerDriverByPcPerTime =
      this.calculateDeliveriesCountPerDriverByPcPerTime(deliveries, drivers, maps, day, kitchen.id as KitchenEnum);

    const routePlanResultsByTime = await Promise.all(
      times.map((time) => {
        const map = maps.find((m) => m.deliveryTime === time);
        if (!map) {
          console.error('No map found for time', time);
          return null;
        }
        const sortedDeliveries: RouteGenerationProps = {
          deliveries,
          country: kitchen.country,
          map
        };
        return RoutePlanServiceService.generateRoutePlanForDrivers({
          time,
          data: sortedDeliveries,
          day,
          drivers,
          kitchen,
          isPreview,
          ukInvoiceCodes,
          deliveriesCountByDriver: deliveriesCountPerDriverByPCAndTime
        });
      })
    );
    // Drops routeplans with no map(related by deliveryTime) so downstream code only
    // handles actual route plan results.
    const routePlanResults = routePlanResultsByTime.filter(
      (result): result is { deliveriesWithDriver: DeliveryForRouteGeneration[]; pendingWrites: RoutePlanWriteBatch } =>
        result !== null
    );

    const updatedDeliveriesWithDrivers = flatten(routePlanResults.map((result) => result.deliveriesWithDriver));
    const pendingWrites: RoutePlanWriteBatch = {
      routePlanWrites: [],
      invoiceCodesWrites: [],
      deliveryDriverWrites: []
    };
    // Aggregate pending writes from all route plan results
    for (const result of routePlanResults) {
      pendingWrites.routePlanWrites.push(...result.pendingWrites.routePlanWrites);
      pendingWrites.invoiceCodesWrites.push(...result.pendingWrites.invoiceCodesWrites);
      pendingWrites.deliveryDriverWrites.push(...result.pendingWrites.deliveryDriverWrites);
    }
    logger.info(
      `Assigned drivers to ${updatedDeliveriesWithDrivers.length} deliveries for kitchen ${kitchen.id} on ${day}`
    );

    const populatedDeliveries = this.handleUnassignedDrivers(deliveries, updatedDeliveriesWithDrivers);
    logger.info(
      `Populated deliveries for kitchen ${kitchen.id} on ${day}:`,
      JSON.stringify(populatedDeliveries.length, null, 2)
    );
    return {
      deliveries: populatedDeliveries,
      ukInvoiceCodes,
      pendingWrites,
      kitchen,
      day,
      isPreview
    };
  }

  public static async getDriversMap() {
    const driverRepository = new DriverRepository();

    // Fetch all users (drivers) in one call
    const { users: driversList } = await driverRepository.fetchUsers();

    const drivers: Record<string, Driver> = {};
    for (const d of driversList) {
      drivers[d.id] = {
        id: d.id,
        driverName: d.name,
        email: d.email,
        phoneNumber: d.phoneNumber,
        kitchen: d.kitchen
      };
    }

    return drivers;
  }

  private static handleUnassignedDrivers(
    deliveries: DeliveryForRouteGeneration[],
    deliveriesWithDrivers: DeliveryForRouteGeneration[]
  ): DeliveryForRouteGeneration[] {
    const deliveriesWithDriversMap = keyBy(deliveriesWithDrivers, 'sk');

    return deliveries.map((d) => {
      if (deliveriesWithDriversMap[d.sk]) {
        return deliveriesWithDriversMap[d.sk];
      } else {
        return {
          ...d,
          priority: -1,
          driver: {
            id: 'unassigned',
            name: 'unassigned'
          },
          shortId: '-1'
        };
      }
    });
  }

  public static assignDriverToDeliveries({
    deliveries,
    extraDeliveryData
  }: {
    deliveries: DeliveryForRouteGeneration[];
    extraDeliveryData: Dictionary<ExtraDeliveryData>;
  }): DeliveryForRouteGeneration[] {
    const deliveriesWithDriver: DeliveryForRouteGeneration[] = [];
    for (let d of deliveries) {
      if (extraDeliveryData[d.sk]) {
        d = {
          ...d,
          priority: extraDeliveryData[d.sk].priority,
          driver: {
            id: extraDeliveryData[d.sk].driverId,
            name: extraDeliveryData[d.sk].driverName
          },
          shortId: extraDeliveryData[d.sk].shortId
        };
      }
      deliveriesWithDriver.push(d);
    }

    return deliveriesWithDriver;
  }
}
