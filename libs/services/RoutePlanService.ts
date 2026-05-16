import { format, subDays } from 'date-fns/fp';
import { groupBy, sortBy, chunk, mapValues, sum, includes, has, entries, values } from 'lodash';
import {
  Kitchen,
  LatLng,
  RouteGenerationDelivery,
  DeliveryForRouteGeneration,
  ExtraDeliveryData,
  RouteGenerationProps,
  Dictionary,
  RouteItem
} from 'libs/interfaces';
import { RoutePlanRepository } from '../repositories';
import { Brand, Country, Kitchen as KitchenEnum, DeliveryTime } from 'libs/enums';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { multiPolygon, point } from '@turf/helpers';
import { generateShortId, makeRoutePlan } from '../factories';
import {
  CustomInvoiceCodes,
  DeliveriesCountPerDriverByPcPerTime,
  IDriver as Driver,
  GenerateRoutePlanProps,
  RouteGenerationDeliveries,
  RoutePlanWriteBatch
} from '../interfaces';
import { getInitialShortIdChar, getNewShortId } from '../utils';
import { DriverService } from './DriverService';
import { InvoiceCodesService } from './InvoiceCodesService';
import { isPostalCodeInArea } from 'libs/utils';
import { logger } from '@teamcalo/core';
import { InvoiceCodesEntity } from '../entities';
import { runWithLimit } from '../utils';

type InvoiceCodesCache = {
  entity: InvoiceCodesEntity | null;
  codes: Dictionary<string>;
};

export class RoutePlanServiceService {
  // Tracks deliveries matched to drivers during both phases to ensure no delivery is
  // assigned to multiple drivers. This is necessary because some deliveries may match
  // multiple drivers' areas, and we want to avoid duplicates in the response and database writes.
  private static async trackDeliveriesForDriver(
    driverId: string,
    deliveriesForDriver: DeliveryForRouteGeneration[],
    matchedDeliveryIds: Set<string>,
    deliveriesByDriver: Record<string, DeliveryForRouteGeneration[]>
  ) {
    if (!driverId || deliveriesForDriver.length === 0) {
      return;
    }
    const current = deliveriesByDriver[driverId] ?? [];
    for (const delivery of deliveriesForDriver) {
      if (matchedDeliveryIds.has(delivery.sk)) {
        continue;
      }
      matchedDeliveryIds.add(delivery.sk);
      current.push(delivery);
    }
    deliveriesByDriver[driverId] = current;
  }

  // Tracks invoice codes in the ukInvoiceCodes structure to ensure that within a single batch
  // generation, we do not assign the same custom code to multiple deliveries, even if they have
  // different existing codes. This can happen when multiple deliveries share the same postal
  // code and driver, and the existing codes are duplicates or missing.
  private static async resolveInvoiceCodesCache(
    invoiceCodesCache: InvoiceCodesCache | undefined,
    kitchen: KitchenEnum,
    day: string,
    driverId: string,
    time: DeliveryTime,
    isPreview: boolean
  ): Promise<InvoiceCodesCache> {
    if (invoiceCodesCache) {
      return invoiceCodesCache;
    }
    const fetched = await InvoiceCodesService.fetchInvoiceCodes(kitchen, day, driverId, time, isPreview);
    return {
      entity: fetched ?? null,
      codes: { ...fetched?.codes }
    };
  }

  public static async generateRoutePlanForDrivers({
    data,
    drivers,
    kitchen,
    day,
    time,
    isPreview,
    ukInvoiceCodes,
    deliveriesCountByDriver
  }: {
    data: RouteGenerationProps;
    drivers: Record<string, Driver>;
    kitchen: Kitchen;
    day: string;
    time: DeliveryTime;
    isPreview: boolean;
    ukInvoiceCodes: CustomInvoiceCodes;
    deliveriesCountByDriver: DeliveriesCountPerDriverByPcPerTime;
  }): Promise<{ deliveriesWithDriver: DeliveryForRouteGeneration[]; pendingWrites: RoutePlanWriteBatch }> {
    const weekDayNumber = new Date(day).getDay();
    const areas = groupBy(
      ((data.map && data.map.deliveryAreas) || []).filter((area) => !!area.drivers?.[weekDayNumber]),
      (area) => area.drivers[weekDayNumber]
    );
    const deliveryData = data.deliveries.filter((d) => d.time === time);
    const deliveriesWithDriver: DeliveryForRouteGeneration[] = [];
    const pendingWrites: RoutePlanWriteBatch = {
      routePlanWrites: [],
      invoiceCodesWrites: [],
      deliveryDriverWrites: []
    };
    const invoiceCodesCacheByDriver: Record<string, InvoiceCodesCache> = {};
    const invoiceCodesWritesByDriver: Record<string, RoutePlanWriteBatch['invoiceCodesWrites'][number]> = {};
    const matchedDeliveryIds = new Set<string>();
    const deliveriesByDriver: Record<string, DeliveryForRouteGeneration[]> = {};

    // Phase 1: Postal code matching for GB regular delivery areas
    if (kitchen.id === KitchenEnum.GB1) {
      const areasWithPostalCodes = Object.entries(areas).filter(([_, areaList]) =>
        areaList.some((area) => area.postCodes && area.postCodes.length > 0)
      );

      logger.info('🚀 ~ handler ~ areasWithPostalCodes:', JSON.stringify(areasWithPostalCodes.length, null, 2));
      const chunkedPostalCodeAreas = chunk(areasWithPostalCodes, 10);
      let postalCodeIndex = 0;

      for await (const c of chunkedPostalCodeAreas) {
        console.log('processing postal code matching index', time, postalCodeIndex);
        await Promise.all(
          c.map(async ([key, value]) => {
            const postalCodesForDriver = value.flatMap((area) => area.postCodes ?? []);

            if (postalCodesForDriver.length === 0 || !key) {
              return;
            }

            const deliveriesForDriver = deliveryData
              .filter((d) => !matchedDeliveryIds.has(d.sk))
              .filter((d) => d.deliveryAddress.postalCode)
              .filter((d) => isPostalCodeInArea(d.deliveryAddress.postalCode, postalCodesForDriver));

            if (deliveriesForDriver.length === 0) {
              return;
            }

            const driver = drivers[key as keyof typeof drivers];
            logger.info('🚀 ~ handler ~ postalcode driver:', JSON.stringify(driver, null, 2));

            this.generateCustomInvoiceCodes({
              deliveries: deliveriesForDriver,
              driverId: driver?.id ?? '',
              driverName: driver?.driverName ?? '',
              time,
              country: data.country,
              ukInvoiceCodes,
              deliveriesCountByDriver
            });

            await this.trackDeliveriesForDriver(driver.id, deliveriesForDriver, matchedDeliveryIds, deliveriesByDriver);
          })
        );
        postalCodeIndex++;
      }
    }

    // Phase 2: Polygon fallback matching
    const chunkedAreas = chunk(Object.entries(areas), 10);
    let index = 0;
    for await (const c of chunkedAreas) {
      console.log('processing index', time, index);
      await Promise.all(
        c.map(async ([key, value]) => {
          const areas = multiPolygon(
            value.map((area) => [
              [...area.bounds.map((b) => [b.lng, b.lat]), [area.bounds[0].lng, area.bounds[0].lat]]
            ])
          );
          const deliveriesForDriver = deliveryData
            .filter((d) => !matchedDeliveryIds.has(d.sk))
            .filter((d) => booleanPointInPolygon(point([d.deliveryAddress.lng, d.deliveryAddress.lat]), areas));

          if (deliveriesForDriver.length === 0 || !key) {
            return;
          }
          const driver = drivers[key];
          if (!driver) {
            return;
          }
          logger.info('🚀 ~ handler ~ polygon driver:', JSON.stringify(driver, null, 2));
          if (kitchen.id === KitchenEnum.GB1) {
            this.generateCustomInvoiceCodes({
              deliveries: deliveriesForDriver,
              driverId: driver.id ?? '',
              driverName: driver?.driverName ?? '',
              time,
              country: data.country,
              ukInvoiceCodes,
              deliveriesCountByDriver
            });
          }
          await this.trackDeliveriesForDriver(driver.id, deliveriesForDriver, matchedDeliveryIds, deliveriesByDriver);
        })
      );
      index++;
    }

    // process nationwide areas
    // originally kitchen uses sk but everywhere else id thus both now
    if (kitchen.id === KitchenEnum.GB1 || kitchen.sk === KitchenEnum.GB1) {
      const nationwideAreas = data.map?.nationwideAreas ?? [];
      for (const area of nationwideAreas) {
        const driver = drivers[area.drivers[weekDayNumber]];
        if (!driver) {
          continue;
        }
        const nationwideDeliveriesForDriver = deliveryData
          .filter((d) => d.deliveryAddress.postalCode)
          .filter((d) => !matchedDeliveryIds.has(d.sk))
          .filter((d) => isPostalCodeInArea(d.deliveryAddress.postalCode, area.postCodes));

        this.generateCustomInvoiceCodes({
          deliveries: nationwideDeliveriesForDriver,
          driverId: driver.id ?? '',
          driverName: driver?.driverName ?? '',
          time,
          country: data.country,
          ukInvoiceCodes,
          deliveriesCountByDriver
        });

        if (nationwideDeliveriesForDriver.length === 0) {
          continue;
        }
        await this.trackDeliveriesForDriver(
          driver.id,
          nationwideDeliveriesForDriver,
          matchedDeliveryIds,
          deliveriesByDriver
        );
      }
    }

    // Build per-driver work items for bounded-concurrency route generation.
    // Bounded is to cap the number of drivers ran in parallel
    const perDriverEntries: Array<{
      driverId: string;
      driver: Driver;
      deliveriesForDriver: DeliveryForRouteGeneration[];
    }> = Object.entries(deliveriesByDriver)
      .map(([driverId, deliveriesForDriver]) => ({
        driverId,
        deliveriesForDriver,
        driver: drivers[driverId]
      }))
      .filter(
        (entry): entry is { driverId: string; driver: Driver; deliveriesForDriver: DeliveryForRouteGeneration[] } =>
          !!entry.driver && entry.deliveriesForDriver.length > 0
      );

    // All write operations are tracked in pendingWrites and executed at the end.
    const perDriverResults = await runWithLimit(perDriverEntries, async (entry) => {
      const { driverId, deliveriesForDriver, driver } = entry;
      const deliveriesForRouteGeneration: RouteGenerationDeliveries[] = deliveriesForDriver.map((d) => ({
        id: d.sk,
        coords: { lat: d.deliveryAddress.lat, lng: d.deliveryAddress.lng },
        deliveryDay: d.deliveryDay!,
        shortId: d.shortId!,
        brand: d.brand || Brand.CALO,
        userId: d.userId,
        postalCode: d.areaPostalCode ?? d.deliveryAddress.postalCode ?? 'NO_PC'
      }));

      logger.info(
        '🚀 ~ handler ~ deliveriesForRouteGeneration:',
        JSON.stringify(deliveriesForRouteGeneration.length, null, 2)
      );
      const invoiceCodesCache = await this.resolveInvoiceCodesCache(
        invoiceCodesCacheByDriver[driverId],
        kitchen.sk as KitchenEnum,
        day,
        driverId,
        time,
        isPreview
      );
      invoiceCodesCacheByDriver[driverId] = invoiceCodesCache;

      const { extraDeliveryData, pendingWrites: driverWrites } = await this.generateRoutePlanForDriver({
        country: data.country,
        kitchen: kitchen.sk as KitchenEnum,
        kitchenLocation: kitchen.location,
        deliveries: deliveriesForRouteGeneration as unknown as RouteGenerationDelivery[],
        driverId: driver.id ?? '',
        driverName: driver?.driverName ?? '',
        driverEmail: driver?.email ?? '',
        driverPhoneNumber: driver?.phoneNumber ?? '',
        day,
        time,
        isPreview,
        ukInvoiceCodes,
        invoiceCodesCache
      });

      return {
        driverId,
        deliveriesForDriver,
        extraDeliveryData,
        driverWrites,
        invoiceCodesCache
      };
    });

    for (const result of perDriverResults) {
      pendingWrites.routePlanWrites.push(...result.driverWrites.routePlanWrites);
      pendingWrites.deliveryDriverWrites.push(...result.driverWrites.deliveryDriverWrites);

      if (!isPreview) {
        invoiceCodesWritesByDriver[result.driverId] = {
          invoiceCodes: result.invoiceCodesCache.entity,
          kitchen: kitchen.sk as KitchenEnum,
          day,
          driverId: result.driverId,
          time,
          isPreview,
          codes: result.invoiceCodesCache.codes
        };
      }

      deliveriesWithDriver.push(
        ...DriverService.assignDriverToDeliveries({
          deliveries: result.deliveriesForDriver,
          extraDeliveryData: result.extraDeliveryData
        })
      );
    }

    pendingWrites.invoiceCodesWrites = Object.values(invoiceCodesWritesByDriver);

    return { deliveriesWithDriver, pendingWrites };
  }

  public static async generateRoutePlanForDriver({
    country,
    kitchen,
    deliveries,
    driverEmail,
    driverId,
    driverName,
    driverPhoneNumber,
    day,
    time,
    kitchenLocation,
    isPreview,
    ukInvoiceCodes,
    invoiceCodesCache
  }: GenerateRoutePlanProps & { invoiceCodesCache?: InvoiceCodesCache }): Promise<{
    extraDeliveryData: Dictionary<ExtraDeliveryData>;
    pendingWrites: RoutePlanWriteBatch;
  }> {
    const routePlanRepository = new RoutePlanRepository();
    logger.info(
      `Generating route plan for driver ${driverId} on ${day} (${time}) with ${deliveries.length} deliveries`
    );
    const kitchenPosition = {
      id: 'KITCHEN',
      ...kitchenLocation
    };

    const deliveryDay = time === DeliveryTime.evening ? format('yyyy-MM-dd')(subDays(1)(new Date(day))) : day;
    const existingPlan = await routePlanRepository.getByDayIdTime(deliveryDay, driverId, time);
    let extraDeliveryData: Dictionary<ExtraDeliveryData> = {};
    const pendingWrites: RoutePlanWriteBatch = {
      routePlanWrites: [],
      invoiceCodesWrites: [],
      deliveryDriverWrites: []
    };
    const newRoute: Dictionary<RouteItem> = { ...existingPlan?.routePlan };
    if (!existingPlan || !existingPlan.routePlan[kitchenPosition.id]) {
      newRoute[kitchenPosition.id] = this.formatNewRouteItem({ id: kitchenPosition.id, coords: kitchenLocation }, 0);
    }
    for (const d of deliveries) {
      if (!newRoute[d.id]) {
        newRoute[d.id] = this.formatNewRouteItem(d, Object.keys(newRoute).length);
      }
    }

    const prior = sortBy(newRoute, 'priority').map((r) => r.id);
    const planEntity = makeRoutePlan(
      day,
      time,
      driverId,
      newRoute,
      country,
      kitchen,
      prior,
      driverEmail,
      driverPhoneNumber,
      driverName,
      kitchenPosition,
      deliveries
    );

    if (!isPreview) {
      if (existingPlan) {
        existingPlan.set({
          routePlan: newRoute,
          priority: prior,
          totalDeliveries: prior.length - 1,
          dispatch: {
            ...existingPlan.dispatch,
            bags: {
              ...existingPlan.dispatch.bags,
              [Brand.CALO]: prior.length - 1,
              [Brand.MEALO]: 0
            }
          }
        });
        logger.info(
          // eslint-disable-next-line max-len
          `Updating existing route plan ${existingPlan.id} for driver ${driverId} on ${day} (${time}) with ${deliveries.length} deliveries`
        );
        pendingWrites.routePlanWrites.push({ type: 'update', entity: existingPlan });
      } else {
        logger.info(
          `Creating new route plan for driver ${driverId} on ${day} (${time}) with ${deliveries.length} deliveries`
        );
        pendingWrites.routePlanWrites.push({ type: 'create', entity: planEntity });
      }
    }

    const resolvedInvoiceCodesCache = await this.resolveInvoiceCodesCache(
      invoiceCodesCache,
      kitchen,
      day,
      driverId,
      time,
      isPreview
    );
    const codes = resolvedInvoiceCodesCache.codes;

    // GB1-specific: Detect and fix duplicate invoice codes
    if (kitchen === KitchenEnum.GB1) {
      const driverInitials = this.getDriverInitials(driverName);
      const initialChar = getInitialShortIdChar(country, time);
      const maxExistingPriority = this.calculateMaxPriority(codes, driverInitials);
      let nextPriority = maxExistingPriority + 1;

      const duplicateCodes = this.findDuplicateCodes(codes);
      const codesInThisBatch: string[] = [];

      for (const d of deliveries) {
        const route = newRoute[d.id];
        if (route) {
          const existingCode = codes[d.id];
          const customCode = ukInvoiceCodes[driverId]?.[d.postalCode ?? 'NO_PC']?.[time]?.[d.id];
          const codeToCheck = existingCode ?? customCode;
          const isDuplicate = this.isCodeDuplicate(codeToCheck, duplicateCodes, codesInThisBatch);

          // If no code exists, or if existing code is duplicate, generate a new one
          if ((!existingCode && !customCode) || isDuplicate) {
            const newCode = this.generateUniqueCode(
              codes,
              codesInThisBatch,
              driverName,
              initialChar,
              nextPriority,
              d.id
            );
            codes[d.id] = newCode;
            codesInThisBatch.push(newCode);
            nextPriority++;
          } else {
            const finalCode = existingCode ?? customCode ?? codes[d.id];
            codes[d.id] = finalCode;
            if (finalCode) {
              codesInThisBatch.push(finalCode);
            }
          }

          const fk = `${country || Country.BH}#${day}#${kitchen}#${time}#${driverId || 'NOT_SET'}`;
          extraDeliveryData[d.id] = {
            priority: route.priority || 0,
            driverId,
            driverName,
            shortId: codes[d.id],
            fk
          };
        }
      }

      this.updateUkInvoiceCodes(ukInvoiceCodes, driverId, deliveries, codes, time, newRoute);
    } else {
      // Non-GB1,

      for (const d of deliveries) {
        const route = newRoute[d.id];
        if (route) {
          const newCode = getNewShortId(codes, d.id, driverName, getInitialShortIdChar(country, time));
          codes[d.id] = newCode;
          const fk = `${country || Country.BH}#${day}#${kitchen}#${time}#${driverId || 'NOT_SET'}`;
          extraDeliveryData[d.id] = {
            priority: route.priority || 0,
            driverId,
            driverName,
            shortId: codes[d.id],
            fk
          };
        }
      }

      if (!isPreview) {
        pendingWrites.deliveryDriverWrites.push({
          deliveries,
          driverName,
          driverId,
          extraDeliveryData
        });
      }
    }

    if (!isPreview && kitchen === KitchenEnum.GB1) {
      pendingWrites.deliveryDriverWrites.push({
        deliveries,
        driverName,
        driverId,
        extraDeliveryData
      });
    }

    logger.info(`Generated route plan for driver ${driverId} on ${day} (${time}) with ${deliveries.length} deliveries`);
    return { extraDeliveryData, pendingWrites };
  }

  private static getDriverInitials(driverName: string): string {
    const [firstName, lastName] = driverName.split(' ');
    return driverName
      ? `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : firstName.charAt(1)}`.toUpperCase()
      : '';
  }

  private static calculateMaxPriority(codes: Dictionary<string>, driverInitials: string): number {
    let maxPriority = 0;
    const escapedDriverInitials = driverInitials.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const allPrefixesPattern = new RegExp(`^[OEM]-${escapedDriverInitials}-(\\d+)$`);

    for (const code of Object.values(codes)) {
      const match = code.match(allPrefixesPattern);
      if (match) {
        const priority = parseInt(match[1], 10);
        if (priority > maxPriority) {
          maxPriority = priority;
        }
      }
    }

    return maxPriority;
  }

  private static findDuplicateCodes(codes: Dictionary<string>): Dictionary<number> {
    const codeOccurrenceMap: Dictionary<number> = {};
    const duplicateCodes: Dictionary<number> = {};

    for (const code of Object.values(codes)) {
      codeOccurrenceMap[code] = (codeOccurrenceMap[code] ?? 0) + 1;
    }

    for (const [code, count] of entries(codeOccurrenceMap)) {
      if (count > 1) {
        duplicateCodes[code] = count;
      }
    }

    return duplicateCodes;
  }

  private static isCodeDuplicate(
    code: string | undefined,
    duplicateCodes: Dictionary<number>,
    codesInThisBatch: string[]
  ): boolean {
    if (!code) {
      return false;
    }
    return has(duplicateCodes, code) || includes(codesInThisBatch, code);
  }

  private static generateUniqueCode(
    existingCodes: Dictionary<string>,
    codesInThisBatch: string[],
    driverName: string,
    initialChar: string | undefined,
    startPriority: number,
    deliveryId: string
  ): string {
    let priority = startPriority;
    let attempts = 0;
    const maxAttempts = 500;

    while (attempts < maxAttempts) {
      const newCode = generateShortId({ driverName, priority, initialChar });
      const codeExists = includes(values(existingCodes), newCode) || includes(codesInThisBatch, newCode);

      if (!codeExists) {
        return newCode;
      }

      priority++;
      attempts++;
    }

    throw new Error(`Failed to generate unique invoice code after ${maxAttempts} attempts for delivery ${deliveryId}`);
  }

  private static updateUkInvoiceCodes(
    ukInvoiceCodes: CustomInvoiceCodes,
    driverId: string,
    deliveries: RouteGenerationDelivery[],
    codes: Dictionary<string>,
    time: DeliveryTime,
    newRoute: Dictionary<RouteItem>
  ): void {
    for (const d of deliveries) {
      const route = newRoute[d.id];
      if (route && codes[d.id]) {
        const postalCode = d.postalCode ?? 'NO_PC';
        if (!ukInvoiceCodes[driverId]) {
          ukInvoiceCodes[driverId] = {};
        }
        if (!ukInvoiceCodes[driverId][postalCode]) {
          ukInvoiceCodes[driverId][postalCode] = {};
        }
        if (!ukInvoiceCodes[driverId][postalCode][time]) {
          ukInvoiceCodes[driverId][postalCode][time] = {};
        }
        ukInvoiceCodes[driverId][postalCode][time][d.id] = codes[d.id];
      }
    }
  }

  public static parseCode(postalCode: string) {
    const trimmedPostalCode = postalCode.trim();
    const postalCodeParts = trimmedPostalCode.split(/\s+/);

    if (postalCodeParts.length === 2) {
      const postalCodePart1 = postalCodeParts[0];
      const postalCodePart2 = postalCodeParts[1];

      const postalCodePart1Match = postalCodePart1.match(/^([A-Z]+)(\d+)([A-Z]*)$/);
      const postalCodePart2Match = postalCodePart2.match(/^(\d)([A-Z]{2})$/);

      if (postalCodePart1Match && postalCodePart2Match) {
        return {
          outwardPrefix: postalCodePart1Match[1],
          outwardDigit: parseInt(postalCodePart1Match[2]),
          outwardSuffix: postalCodePart1Match[3] || '',
          inwardDigit: parseInt(postalCodePart2Match[1]),
          inwardLetters: postalCodePart2Match[2]
        };
      }
    } else {
      const postalCodeMatch = trimmedPostalCode.match(/^([A-Z]+)(\d+)([A-Z]*)$/);
      if (postalCodeMatch) {
        return {
          outwardPrefix: postalCodeMatch[1],
          outwardDigit: parseInt(postalCodeMatch[2]),
          outwardSuffix: postalCodeMatch[3] || '',
          inwardDigit: 0,
          inwardLetters: ''
        };
      }
    }

    return {
      outwardPrefix: postalCode,
      outwardDigit: 0,
      outwardSuffix: '',
      inwardDigit: 0,
      inwardLetters: ''
    };
  }

  public static generateCustomInvoiceCodes({
    deliveries,
    driverId,
    driverName,
    time,
    country,
    ukInvoiceCodes,
    deliveriesCountByDriver
  }: {
    deliveries: DeliveryForRouteGeneration[];
    driverId: string;
    driverName: string;
    time: DeliveryTime;
    country: Country;
    ukInvoiceCodes: CustomInvoiceCodes;
    deliveriesCountByDriver: DeliveriesCountPerDriverByPcPerTime;
  }) {
    ukInvoiceCodes[driverId] = {
      ...ukInvoiceCodes[driverId],
      ...mapValues(
        groupBy(deliveries, (d) => d.areaPostalCode ?? d.deliveryAddress.postalCode ?? 'NO_PC'),
        (deliveries, postalCode) => {
          const ids = deliveries.map((d) => d.sk);
          const ukInvoiceCodesForPostalCode = ukInvoiceCodes[driverId]?.[postalCode] ?? {};
          const customInvoiceCodeCount = Object.values(ukInvoiceCodesForPostalCode).reduce(
            (acc, curr) => acc + Object.keys(curr).filter((deliveryId) => !ids.includes(deliveryId)).length,
            0
          );

          const sortedDeliveriesCountByPostalCode = Object.entries(deliveriesCountByDriver[driverId] ?? {}).sort(
            (a, b) => {
              const parsedA = this.parseCode(a[0]);
              const parsedB = this.parseCode(b[0]);

              if (parsedA.outwardPrefix !== parsedB.outwardPrefix) {
                return parsedA.outwardPrefix.localeCompare(parsedB.outwardPrefix);
              }

              if (parsedA.outwardDigit !== parsedB.outwardDigit) {
                return parsedA.outwardDigit - parsedB.outwardDigit;
              }

              if (parsedA.outwardSuffix !== parsedB.outwardSuffix) {
                return parsedA.outwardSuffix.localeCompare(parsedB.outwardSuffix);
              }

              if (parsedA.inwardDigit !== parsedB.inwardDigit) {
                return parsedA.inwardDigit - parsedB.inwardDigit;
              }

              return parsedA.inwardLetters.localeCompare(parsedB.inwardLetters);
            }
          );

          let currentPostalCodeStart = 0;

          for (const [sortedPostalCode, deliveriesCountByTime] of sortedDeliveriesCountByPostalCode) {
            if (sortedPostalCode === postalCode) {
              break;
            }
            currentPostalCodeStart += sum(Object.values(deliveriesCountByTime)) ?? 0;
          }

          const existingDeliveriesForTime = ukInvoiceCodesForPostalCode?.[time];

          return {
            ...ukInvoiceCodesForPostalCode,
            [time]: {
              ...existingDeliveriesForTime,
              ...deliveries.reduce<Dictionary<string>>((acc, curr) => {
                acc[curr.sk] = generateShortId({
                  driverName: driverName ?? '',
                  priority: Object.values(acc).length + currentPostalCodeStart + customInvoiceCodeCount + 1,
                  initialChar: getInitialShortIdChar(country, time)
                });
                return acc;
              }, {})
            }
          };
        }
      )
    };
  }

  private static formatNewRouteItem(item: { id: string; coords: LatLng }, priority: number) {
    return {
      id: item.id,
      priority,
      travelTime: 0,
      isMatched: false,
      origin: { lat: item.coords.lat, lng: item.coords.lng }
    };
  }
}
