import { logger } from '@teamcalo/core';
import { MultiRouteOutput } from '../../../../driver/libs/interfaces';

import { getAssignedRoutes } from '../helper';
import { DriverRepository } from 'libs/repositories/Cognito';
import { getDriverNames } from '../../utils';
import { RoutingOutput } from 'services/routing/libs';

interface MultiRouteWithDriver extends MultiRouteOutput {
  driverNames: { [id: string]: string };
}

class GetTimeWindowRouteUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  async exec(fileName: string): Promise<MultiRouteOutput | MultiRouteWithDriver | null> {
    try {
      logger.info('Fetching time window route for fileName:', { fileName });
      const route = await getAssignedRoutes(fileName);

      // Multi Route Handling
      const hasRoutesArray = Array.isArray(route?.routes);
      if (hasRoutesArray && route.routes.length > 1) {
        // resizing routes to reduce payload size as we only need vehicleLabel and simulated
        // for the UI, and metrics for error handling. The actual route details are not needed
        // for the time window route view.
        if (route.routingParams) {
          const {
            shipments: _shipments,
            vehicles: _vehicles,
            deliveriesWithTimeWindows: _deliveriesWithTimeWindows,
            ...rest
          } = route.routingParams;
          route.routingParams = rest as typeof route.routingParams;
        }

        let resizedRoutes = [];
        for (const r of route.routes) {
          let resizedRoute = {
            vehicleLabel: r.vehicleLabel,
            simulated: r.simulated,
            actual: {
              route: [],
              metrics: {
                totalWithinWindow: 0,
                duration: 0,
                deliveryDuration: 0,
                performedDeliveries: 0,
                skippedDeliveries: 0,
                error: ''
              }
            },
            error: r.error
          };
          resizedRoutes.push(resizedRoute);
        }
        route.routes = resizedRoutes;

        const vehicleLabels = route.routes.map((r: RoutingOutput) => r.vehicleLabel);
        const drivers = await getDriverNames(this.driverRepository, vehicleLabels);
        return {
          ...route,
          driverNames: drivers
        };
      }
      return route;
    } catch (error) {
      logger.error('Error fetching time window route:', { error });
      return null;
    }
  }
}

export default GetTimeWindowRouteUseCase;
