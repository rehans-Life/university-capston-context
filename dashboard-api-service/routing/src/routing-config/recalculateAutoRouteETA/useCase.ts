import { LocationRepository } from 'libs/repositories/API';
import { isWithinWindow } from '../helper';
import { AutoRouteItem, RouteMetrics, RecalculateEtaRequest } from '../../../libs/interfaces';
import { RoutePointWithEta } from 'libs/interfaces';

export interface RecalculateAutoRouteETAResponse {
  simulated: {
    route: AutoRouteItem[];
    metrics: RouteMetrics;
  };
}

class RecalculateAutoRouteETAUseCase {
  constructor(private readonly locationRepository: LocationRepository) {}

  async exec(data: RecalculateEtaRequest): Promise<RecalculateAutoRouteETAResponse> {
    const routeWithETAs = await this.locationRepository.generateRoute({
      departurePosition: { lat: data.deliveries[0].lat!, lng: data.deliveries[0].lng! },
      routePoints: data.deliveries.map((d: AutoRouteItem) => ({
        id: d.id,
        priority: d.priority,
        lat: d.lat!,
        lng: d.lng!
      })),
      deliveryStartTime: data.parameters.startTime,
      optimize: false
    });

    // Travel Duration Multiplier logic
    const routesWithMultipliedTravelTime: RoutePointWithEta[] = routeWithETAs.reduce((adjustedRoutes, route, index) => {
      // First delivery ETA remains the same
      if (index === 0) {
        adjustedRoutes.push(route);
        return adjustedRoutes;
      }

      const previousAdjustedEta = new Date(adjustedRoutes[index - 1].eta);
      const currentEta = new Date(routeWithETAs[index].eta);
      const originalPreviousEta = new Date(routeWithETAs[index - 1].eta);
      const travelTimeMilliseconds = currentEta.getTime() - originalPreviousEta.getTime();

      const adjustedTravelTimeMs = travelTimeMilliseconds * (data.parameters.travelDurationMultiple ?? 1);
      const newEta = new Date(previousAdjustedEta.getTime() + adjustedTravelTimeMs);

      adjustedRoutes.push({
        ...route,
        eta: newEta.toISOString()
      });

      return adjustedRoutes;
    }, [] as RoutePointWithEta[]);

    // ETA Adjustment logic
    const routesWithAdjustedETAs: RoutePointWithEta[] = routesWithMultipliedTravelTime.map(
      (route: RoutePointWithEta, index: number) => {
        const baseEta = new Date(route.eta);
        const adjustedEta = new Date(baseEta.getTime() + index * (data.parameters.averageDeliveryTime ?? 0) * 1000);
        return {
          ...route,
          eta: adjustedEta.toISOString()
        };
      }
    );

    const firstEta = new Date(routesWithAdjustedETAs[0].eta); // No Kitchen therefore index 0 is safe
    const lastETA = new Date(routesWithAdjustedETAs[routesWithAdjustedETAs.length - 1].eta);

    const simulatedTimeMinutes = (lastETA.getTime() - firstEta.getTime()) / (1000 * 60);

    const deliveriesWithETAs = data.deliveries.map((delivery: AutoRouteItem, index: number) => {
      const eta = routesWithAdjustedETAs[index].eta;
      return {
        ...delivery,
        deliveredAt: eta,
        isSkipped: data.parameters.endTime ? new Date(eta) > new Date(data.parameters.endTime) : false,
        withinWindow: delivery.timeWindows ? isWithinWindow(delivery.timeWindows[0], eta) : false
      };
    });

    const deliveriesWithoutKitchen = deliveriesWithETAs.filter((d) => !d.id.startsWith('KITCHEN'));
    const actualFirstDeliveryTime = deliveriesWithoutKitchen[0]?.deliveredAt;
    const actualLastDeliveryTime = deliveriesWithoutKitchen[deliveriesWithoutKitchen.length - 1]?.deliveredAt;
    const actualDeliveryDuration =
      actualFirstDeliveryTime && actualLastDeliveryTime
        ? (new Date(actualLastDeliveryTime).getTime() - new Date(actualFirstDeliveryTime).getTime()) / (1000 * 60)
        : 0;

    return {
      simulated: {
        route: deliveriesWithETAs,
        metrics: {
          duration: simulatedTimeMinutes,
          deliveryDuration: actualDeliveryDuration,
          totalWithinWindow: deliveriesWithETAs.filter((d) => d.withinWindow).length,
          performedDeliveries: deliveriesWithoutKitchen.filter((d) => !d.isSkipped).length,
          skippedDeliveries:
            deliveriesWithoutKitchen.length - deliveriesWithoutKitchen.filter((d) => !d.isSkipped).length
        }
      }
    };
  }
}

export default RecalculateAutoRouteETAUseCase;
