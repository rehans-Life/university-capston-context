import { BaseAPIRepositoryV3 } from 'libs/repositories/API';
import { Country, DeliveryTime } from 'libs/enums';
import { LatLng } from 'libs/interfaces';
import {
  ETARange,
  GetRoutingReq,
  LocationServiceGetRoutePathResponse,
  RouteCalculationRequest,
  RoutePointWithEta
} from '../interfaces';

class LocationRepository extends BaseAPIRepositoryV3 {
  constructor(locationBaseUrl: string) {
    super();
    this.baseUrl = locationBaseUrl;
  }

  public async getDriversPositions(country: Country, driverIds: string) {
    const response = await this.getRequest(`/v1/tracking/${country}/positions`, { driverIds });
    console.log('api response: ', response);
    return response;
  }

  public async getEta(subId: string, day: string, deliveryTime: DeliveryTime): Promise<ETARange> {
    return (await this.getRequest(`/v1/deliveries/${subId}/eta`, { day, deliveryTime })) as ETARange;
  }

  public async calculateRoute(data: RouteCalculationRequest): Promise<RoutePointWithEta[]> {
    console.log('RouteCalculationRequest', data);
    const response = (await this.postRequest('/v1/routing/calculate-route', data)) as RoutePointWithEta[];
    console.log('RouteCalculationResponse', response);
    return response;
  }

  public async generateRoute(data: RouteCalculationRequest): Promise<RoutePointWithEta[]> {
    const response = (await this.postRequest('/v1/routing/generate-route', data)) as RoutePointWithEta[];
    return response;
  }

  public async getRoutePath(data: GetRoutingReq): Promise<LocationServiceGetRoutePathResponse> {
    const response = (await this.getRequest(
      '/v1/routing/path',
      data as unknown as Record<string, string>
    )) as LocationServiceGetRoutePathResponse;
    return response;
  }

  public async updateTrackingPosition(country: Country, driverId: string, location: LatLng): Promise<void> {
    return (await this.putRequest(`/v1/tracking/${country}/positions/${driverId}`, { location })) as unknown as void;
  }
}

export default LocationRepository;
