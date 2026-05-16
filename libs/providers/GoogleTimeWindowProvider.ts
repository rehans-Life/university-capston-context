import { GoogleAuth } from 'google-auth-library';
import { logger } from '@calo/core';
import { LatLng, AutoRouteItem, TimeWindow, Shipment, Vehicle, RoutingOutput } from '../interfaces';

class GoogleTimeWindowProvider {
  public async runRoutingAlgorithm(
    shipments: Shipment[],
    vehicles: Vehicle[],
    startTime: string,
    endTime: string,
    globalDurationCostPerHour: number = 1
  ) {
    const body = {
      considerRoadTraffic: true,
      model: {
        globalDurationCostPerHour: globalDurationCostPerHour,
        globalStartTime: startTime,
        globalEndTime: endTime,
        shipments: shipments,
        vehicles
      }
    };
    logger.debug(`routing request body: ${JSON.stringify(body)}`);
    const data = (await this.callGoogleRoutingAPI(body)) as any;
    logger.debug(`routing response: ${JSON.stringify(data)}`);
    return data;
  }

  private async callGoogleRoutingAPI(body: any) {
    logger.debug('calling google routing API with body:', JSON.stringify(body, null, 2));
    try {
      const serviceAccountJson = JSON.parse(process.env.GOOGLE_ROUTING_SERVICE_ACCOUNT_JSON!);
      const projectId = serviceAccountJson.project_id;
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        credentials: serviceAccountJson
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();

      const response = await fetch(`https://routeoptimization.googleapis.com/v1/projects/${projectId}:optimizeTours`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }

        logger.error('Google Routing API responded with error:', response.status, errorBody);
        if (errorBody && errorBody.error && errorBody.error.message) {
          return { error: { message: errorBody.error.message } };
        }
      }
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      logger.error('error calling google routing API:', error);
      return { error };
    }
  }

  public async buildRouteFromRoutingResponse(
    routePlanStartTimeIsoString: string,
    kitchenLocation: LatLng,
    routingResponse: any,
    deliveries: AutoRouteItem[],
    endAtKitchen: boolean
  ) {
    let error = null;
    const routes = routingResponse.routes;
    const skippedShipments = routingResponse.skippedShipments;

    const kitchenPickup = {
      id: 'KITCHEN_PICKUP',
      name: 'Kitchen',
      priority: 0,
      lat: kitchenLocation.lat,
      lng: kitchenLocation.lng
    };
    const kitchenDropOff = {
      id: 'KITCHEN_DROPOFF',
      name: 'Kitchen',
      priority: 0,
      lat: kitchenLocation.lat,
      lng: kitchenLocation.lng
    };

    const allRoutes: RoutingOutput[] = [];
    for (const route of routes) {
      const label = route.vehicleLabel ?? 'Unknown Vehicle';
      if (!route.visits) {
        logger.warn('No visits found for route with vehicle:', label);
        error =
          skippedShipments && skippedShipments.length > 0
            ? { message: JSON.stringify(skippedShipments) }
            : { message: 'No visits found' };
        return { error };
      }
      let simulatedPlan: AutoRouteItem[] = [];

      let counter = 1;
      for (const stop of route.visits) {
        if (stop.isPickup) {
          // Skip pickup stops (kitchen)
          continue;
        }
        const delivery = deliveries.find((d) => d.id === stop.shipmentLabel);
        if (delivery) {
          simulatedPlan.push({
            id: delivery.id,
            deliveredAt: stop.startTime,
            priority: counter++,
            avgDeliveredAt: delivery.avgDeliveredAt,
            name: delivery.name,
            timeWindows: delivery.timeWindows,
            withinWindow:
              delivery.timeWindows && delivery.timeWindows[0] && stop.startTime
                ? this.isWithinTimeWindow(delivery.timeWindows[0], stop.startTime)
                : false,
            lat: delivery.lat,
            lng: delivery.lng,
            time: delivery.time
          });
        } else {
          logger.warn(`Delivery with label ${stop.shipmentLabel} not found.`);
          continue;
        }
      }

      // totalDuration is in seconds with an s at the end, convert to minutes and remove the s
      let simulatedTotalDuration = 0;
      let simulatedDeliveryDuration = 0;
      if (route.metrics.totalDuration) {
        simulatedTotalDuration = parseInt(route.metrics.totalDuration.replace('s', '')) / 60;
      }

      // simulated time calculate: time of last delivery - route.vehicleStartTime
      const simulatedFirstDeliveryTime = simulatedPlan[0]?.deliveredAt;
      const simulatedLastDeliveryTime = simulatedPlan[simulatedPlan.length - 1]?.deliveredAt;
      if (simulatedFirstDeliveryTime && simulatedLastDeliveryTime) {
        simulatedDeliveryDuration =
          (new Date(simulatedLastDeliveryTime).getTime() - new Date(simulatedFirstDeliveryTime).getTime()) /
          (1000 * 60);
      } else {
        simulatedDeliveryDuration = simulatedTotalDuration;
      }

      // add skipped shipments to the simulated plan with null deliveredAt
      if (skippedShipments && skippedShipments.length > 0) {
        for (const skipped of skippedShipments) {
          const delivery = deliveries.find((d) => d.id === skipped.label);
          if (delivery) {
            simulatedPlan.push({
              id: delivery.id,
              priority: counter++,
              avgDeliveredAt: delivery.avgDeliveredAt,
              name: delivery.name,
              withinWindow: false,
              timeWindows: delivery.timeWindows,
              lat: delivery.lat,
              lng: delivery.lng,
              isSkipped: true,
              time: delivery.time
            });
          } else {
            logger.warn(`Skipped delivery with label ${skipped.label} not found.`);
          }
        }
      }

      // sort deliveries by deliveredAt
      deliveries.sort((a, b) => {
        if (a.deliveredAt && b.deliveredAt) {
          return new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime();
        } else if (a.deliveredAt) {
          return -1;
        } else if (b.deliveredAt) {
          return 1;
        } else {
          return 0;
        }
      });

      // actual route
      let actualPlan: AutoRouteItem[] = [];
      for (const [index, delivery] of deliveries.entries()) {
        actualPlan.push({
          id: delivery.id,
          deliveredAt: delivery.deliveredAt,
          deliveredLocationDistance: delivery.deliveredLocationDistance,
          priority: index + 1,
          avgDeliveredAt: delivery.avgDeliveredAt,
          timeWindows: delivery.timeWindows,
          withinWindow:
            delivery.deliveredAt && delivery.timeWindows && delivery.timeWindows[0]
              ? this.isWithinTimeWindow(delivery.timeWindows[0], delivery.deliveredAt)
              : false,
          name: delivery.name,
          lat: delivery.lat,
          lng: delivery.lng,
          time: delivery.time
        });
      }

      // actual time calculate: time of last delivery - routePlan start time
      let actualTotalDuration = 0;
      let actualDeliveryDuration = 0;
      if (routePlanStartTimeIsoString) {
        // the last delivery in actualPlan might not have been delivered yet, so we need to find the last one that has actualDeliveredAt
        let actualLastDeliveryTime = actualPlan[actualPlan.length - 1]?.deliveredAt;
        for (let i = actualPlan.length - 1; i >= 0; i--) {
          if (actualPlan[i]?.deliveredAt) {
            actualLastDeliveryTime = actualPlan[i]?.deliveredAt;
            break;
          }
        }
        if (actualLastDeliveryTime) {
          actualTotalDuration =
            (new Date(actualLastDeliveryTime).getTime() - new Date(routePlanStartTimeIsoString).getTime()) /
            (1000 * 60);
        }
      }

      actualDeliveryDuration =
        actualPlan[actualPlan.length - 1]?.deliveredAt && actualPlan[0]?.deliveredAt
          ? (new Date(actualPlan[actualPlan.length - 1]?.deliveredAt!).getTime() -
              new Date(actualPlan[0]?.deliveredAt!).getTime()) /
            (1000 * 60)
          : 0;

      simulatedPlan = [{ ...kitchenPickup, deliveredAt: route.vehicleStartTime }, ...simulatedPlan];

      actualPlan = [{ ...kitchenPickup, deliveredAt: routePlanStartTimeIsoString, priority: 0 }, ...actualPlan];

      if (endAtKitchen) {
        simulatedPlan.push({
          ...kitchenDropOff,
          deliveredAt: route.vehicleEndTime,
          priority: simulatedPlan.length + 1
        });
        // replace route.vehicleEndTime with finishedShift action time
        actualPlan.push({ ...kitchenDropOff, deliveredAt: route.vehicleEndTime, priority: actualPlan.length + 1 });
      }

      allRoutes.push({
        vehicleLabel: label,
        simulated: {
          route: simulatedPlan,
          metrics: {
            totalWithinWindow: simulatedPlan.filter((s) => s.withinWindow).length,
            deliveryDuration: simulatedDeliveryDuration,
            duration: simulatedTotalDuration,
            performedDeliveries: route.metrics.performedShipmentCount,
            skippedDeliveries: skippedShipments ? skippedShipments.length : 0,
            distance: route.metrics.travelDistanceMeters,
            totalDuration: route.metrics.totalDuration,
            waitDuration: route.metrics.waitDuration,
            delayDuration: route.metrics.delayDuration,
            travelDuration: route.metrics.travelDuration,
            visitDuration: route.metrics.visitDuration
          }
        },
        actual: {
          route: actualPlan,
          metrics: {
            totalWithinWindow: actualPlan.filter((a) => a.withinWindow).length,
            performedDeliveries: deliveries.length,
            duration: actualTotalDuration,
            deliveryDuration: actualDeliveryDuration,
            skippedDeliveries: 0
          }
        }
      });
    }
    return {
      routes: allRoutes,
      error: error
    };
  }

  private isWithinTimeWindow(window: TimeWindow, deliveredAt: string): boolean {
    if (!window || !deliveredAt) return false;

    const deliveredAtTime = new Date(deliveredAt).getTime();
    // start time can either be window.startTime or window.softStartTime
    const startValue = window.startTime ?? window.softStartTime;
    if (!startValue) return false;
    const startTime = new Date(startValue).getTime();
    // end time can either be window.endTime or window.softEndTime
    const endValue = window.endTime ?? window.softEndTime;
    if (!endValue) return false;
    const endTime = new Date(endValue).getTime();

    return deliveredAtTime >= startTime && deliveredAtTime <= endTime;
  }
}

export default GoogleTimeWindowProvider;
