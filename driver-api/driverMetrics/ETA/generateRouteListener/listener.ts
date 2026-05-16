import { DeliveryEntity, RoutePlanEntity } from '@calo-backend/entities/DDB';
import { DataType } from '@calo-backend/enums';
import fireEvent from '@calo-backend/fireEvent';
import { Email } from '@calo-backend/interfaces';
import { withSecrets } from '@calo-backend/middleware';
import { DeliveryRepository, RoutePlanRepository } from '@calo-backend/repositories/DDB';
import { ExportService } from '@calo-backend/services';
import middy from '@middy/core';
import { SNSHandler } from 'aws-lambda';
import { SNSEvent } from 'aws-lambda';
import { addDays, format, parseISO } from 'date-fns/fp';
import { InternalServerError } from 'http-errors';
import { keyBy } from 'lodash-es';

import { Country, DeliveryTime } from '@calo/types';

// import { DeliveryTime, Dictionary } from '@calo/types';
import { RoutePoint } from '../../../libs/interfaces';
import { LocationRepository } from '../../../libs/repositories/API';
import { PreferredRouteItem } from '@libs/driver-types';
import { toError } from '@libs/errors';

// import { getDistance } from 'geolib';

export interface DeliveriesGroupForPreferredRoute {
  id: string; //lat-lng
  count: number;
  deliveries: DeliveryEntity[];
  priority?: number;
  isPreviousPriority?: boolean;
  lat: number;
  lng: number;
  bufferTime?: number;
}

export const handler: SNSHandler = middy(async (event: SNSEvent) => {
  return;
  // eslint-disable-next-line no-unreachable
  const { Records: records } = event;
  const deliveryRepository = new DeliveryRepository();
  const locationRepository = new LocationRepository(process.env.LOCATION_SERVICE_URL!);
  const routePlanRepository = new RoutePlanRepository();

  for (const record of records) {
    try {
      const data = JSON.parse(record.Sns.Message);
      const { id, departurePosition, orderedPreferredRoute } = data;

      const routePlanEntity = await routePlanRepository.find({ id: DataType.routePlanNew, sk: id });
      if (!routePlanEntity) {
        throw new InternalServerError('Route plan not found');
      }
      const day =
        routePlanEntity!.time === DeliveryTime.evening
          ? format('yyyy-MM-dd')(addDays(1)(parseISO(routePlanEntity!.day)))
          : routePlanEntity!.day;
      const { driver, kitchen, time } = routePlanEntity!;
      console.log('day for deliveries', day);
      const allowedCountries = [Country.SA, Country.BH];
      if (!allowedCountries.includes(routePlanEntity!.country)) {
        continue;
      }

      const deliveries = await deliveryRepository.getDriverDeliveries(driver.id, day, kitchen, time);
      if (deliveries.length > 48) {
        console.log('deliveries length is over 48', deliveries.length);
      }
      console.log('deliveries length', deliveries.length);
      // const groupDeliveries = groupDeliveriesPerDistance(deliveries);
      // console.log('grouped deliveries', JSON.stringify(groupDeliveries));

      const routePoints: RoutePoint[] = deliveries.map(({ sk, deliveryAddress }) => ({
        id: sk,
        priority: 0,
        lat: deliveryAddress.lat,
        lng: deliveryAddress.lng,
      }));

      const dataForGeneration = {
        departurePosition: departurePosition || routePlanEntity?.kitchenPosition,
        routePoints,
        optimize: true,
        deliveryStartTime: new Date().toISOString(),
      };
      console.log('before generation', JSON.stringify(dataForGeneration));
      const response = await locationRepository.generateRoute(dataForGeneration);

      if (!routePlanEntity) {
        throw new InternalServerError('Route plan not found');
      }
      await sendReport(response, routePlanEntity!, deliveries, orderedPreferredRoute, routePoints);
    } catch (error) {
      const err = toError(error);
      console.log(err);
      throw new InternalServerError(err.message);
    }
  }
}).use(withSecrets());

//for later if needed
// const groupDeliveriesPerDistance = (deliveries: DeliveryEntity[]) => {
//   let remainingDeliveries = deliveries.filter((item) => item.deliveryAddress.lng && item.deliveryAddress.lat);
//   const groupedDeliveries: Dictionary<DeliveriesGroupForPreferredRoute> = {}
//   while (remainingDeliveries.length !== 0) {
//     const matchedDeliveries: DeliveryEntity[] = [];
//     let bufferTime = 0;
//     const notMatchedDeliveries: DeliveryEntity[] = [];
//     const { lat, lng } = remainingDeliveries[0].deliveryAddress;
//     remainingDeliveries.forEach(d => {
//       let distance = -1;
//       try {
//         distance = getDistance({
//           latitude: lat,
//           longitude: lng
//         }, {
//           latitude: d.deliveryAddress.lat,
//           longitude: d.deliveryAddress.lng
//         })
//       } catch (e) {
//         console.log(e);
//       }

//       if (distance <= 10 && distance !== -1) {
//         matchedDeliveries.push(d);
//       } else {
//         notMatchedDeliveries.push(d);
//       }
//     })
//     const group = `${lat}-${lng}`
//     groupedDeliveries[group] = {
//       id: group,
//       count: matchedDeliveries.length,
//       deliveries: matchedDeliveries,
//       bufferTime,
//       lat,
//       lng
//     };
//     remainingDeliveries = notMatchedDeliveries;
//   }
//   return Object.values(groupedDeliveries)

// }

const sendReport = async (
  response: any[],
  plan: RoutePlanEntity,
  deliveries: DeliveryEntity[],
  orderedPreferredRoute: PreferredRouteItem[],
  routePoints: RoutePoint[],
) => {
  const keyedDeliveries = keyBy(deliveries, 'sk');
  const exportService = new ExportService();
  console.log('orderedPreferredRoute', JSON.stringify(orderedPreferredRoute));
  console.log('response', JSON.stringify(response));

  const keyedPreferredRoute = keyBy(orderedPreferredRoute, 'id');
  console.log('keyedPreferredRoute', JSON.stringify(keyedPreferredRoute));

  const records = response.map((item) => ({
    driverId: plan.driver?.id,
    driverName: plan.driver?.driverName,
    customerUserId: keyedDeliveries[item.id].userId,
    customerUserName: keyedDeliveries[item.id].name,
    deliveryTime: keyedDeliveries[item.id].time,
    day: plan.day,
    eta: item.eta ? format('dd.MM.yyyy. hh:mm a')(new Date(item.eta)) : '',
    lat: keyedDeliveries[item.id]?.deliveryAddress?.lat,
    lng: keyedDeliveries[item.id]?.deliveryAddress?.lng,
    order: routePoints.findIndex((rp) => rp.id === item.id) + 1,
    priority: item.priority,
    driverPriority: keyedPreferredRoute[item.id]?.priority,
  }));
  const map = [
    { value: 'driverId', label: 'Driver ID' },
    { value: 'driverName', label: 'Driver Name' },
    { value: 'customerUserId', label: 'Customer ID' },
    { value: 'customerUserName', label: 'Customer User Name' },
    { value: 'deliveryTime', label: 'Delivery Time' },
    { value: 'day', label: 'Day' },
    { value: 'eta', label: 'ETA (UTC time)' },
    { value: 'lat', label: 'LAT' },
    { value: 'lng', label: 'LNG' },
    { value: 'order', label: 'Default Order' },
    { value: 'priority', label: 'Priority' },
    { value: 'driverPriority', label: 'Driver Priority' },
  ];
  //temp-solution
  const csv = await exportService['toCsv'](records, map);
  const fileUrl = await exportService['upload'](csv, 'Driver Metrics');

  const body: Email = {
    markdown: `Your export is ready: [Driver Metrics](${fileUrl}) <br> [Driver map](${getGoogleMap(orderedPreferredRoute)}) <br> [Mappable map](${getGoogleMap(records)})`,
    from: 'Calo <delivery@calo.app>',
    to: ['mhammouri@calo.app', 'a.alkhunaizi@calo.app'].join(','),
    subject: `Driver Metrics ${plan.kitchen}`,
    attachments: [],
    suppress: process.env.STAGE !== 'prod',
  };

  await fireEvent(process.env.EMAIL_TOPIC_ARN!, body);
};

const getGoogleMap = (route: Array<{ origin?: { lat?: number; lng?: number }; lat?: number; lng?: number }>) => {
  const baseUrl = 'https://www.google.com/maps/dir/';
  return baseUrl + route.map((item) => `${item.origin?.lat ?? item.lat},${item.origin?.lng ?? item.lng}`).join('/');
};
