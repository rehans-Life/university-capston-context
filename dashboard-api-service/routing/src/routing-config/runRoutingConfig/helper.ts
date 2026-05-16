import { getDay } from 'date-fns';
import { format } from 'date-fns/fp';
import { NotFound, BadRequest } from 'http-errors';
import { logger } from '@teamcalo/core';

import { MapRepository } from 'libs/repositories/DDB';
import { RoutePlanRepository } from 'libs/repositories/ES';

import { DataType } from 'libs/enums';
import { RoutingConfigEntity } from 'libs/entities/DDB/RoutingConfigEntity';

export async function getRoutePlansForConfig(
  config: RoutingConfigEntity,
  day: string | undefined,
  mapRepository: MapRepository,
  routePlanRepository: RoutePlanRepository
) {
  const map = await mapRepository.find({
    id: `${DataType.map}#${config.country}`,
    sk: `${config.kitchen}#${config.time}`
  });
  if (!map) {
    throw new NotFound('Map Not Found');
  }

  if (config.zoneIds.length === 0) {
    throw new BadRequest('No zone IDs specified in the routing config');
  }

  const deliveryAreas = map.deliveryAreas?.filter((area) => area.id && config.zoneIds.includes(area.id));
  if (!deliveryAreas || deliveryAreas.length === 0) {
    throw new BadRequest('No matching delivery areas found for the provided zone IDs');
  }
  logger.info(`Found ${deliveryAreas.length} delivery areas for Routing Config ID: ${config.id}`);

  const routingDay = day ? new Date(day) : new Date();
  const dayNumber = getDay(routingDay); // 0 (Sunday) to 6 (Saturday)

  let driverIds = deliveryAreas.map((area) => area.drivers?.[dayNumber]).filter((id): id is string => !!id);

  // remove duplicates
  driverIds = [...new Set(driverIds)];

  logger.info(`Found ${driverIds.length} drivers for Routing Config ID: ${config.id}`);

  // for each driverId in driverIds, find the route plan for that driver for day and time
  const routePlans = await routePlanRepository.getRoutePlansListForDriverIds({
    day: format('yyyy-MM-dd')(routingDay),
    time: config.time,
    country: config.country,
    kitchen: config.kitchen,
    driverIds
  });

  logger.info(
    `Found ${routePlans.length} route plans for Routing Config ID: ${config.id} and Day: ${format('yyyy-MM-dd')(
      routingDay
    )} and Time: ${config.time} and Drivers: ${driverIds.join(', ')} and Country: ${config.country} and Kitchen: ${
      config.kitchen
    }`
  );

  return routePlans;
}
