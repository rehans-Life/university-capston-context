import type { LatLngExpression } from 'leaflet';
import { AutoRouteItem, MultiRouteOutput, RouteComplianceAnalysis, SidebarValues } from 'lib/interfaces';

// Initial delivery item interface (before routing)
export interface InitialDeliveryItem {
  id: string;
  origin: {
    lat: number;
    lng: number;
  };
}

export type InitialDeliveries = Record<string, InitialDeliveryItem>;

export interface RouteComponentProps {
  kitchenPosition: { lat: number; lng: number };
  initialDeliveries: InitialDeliveries;
  isLoading: boolean;
  handleCancelPolling: () => void;
  simulatedRoutes: AutoRouteItem[];
  actualRoutes: AutoRouteItem[];
  stats: AllRoutesStats;
  compliance?: RouteComplianceAnalysis;
  country: string;
}

export interface DirectionArrowsProps {
  positions: LatLngExpression[];
  color?: string;
}

export type AllRoutesProps = RouteComponentProps;
export type SimulatedRoutesProps = {
  routeID: string;
  kitchenPosition: { lat: number; lng: number };
  initialDeliveries: InitialDeliveries;
  deliveries: AutoRouteItem[];
  lookbackDays: number;
  stats: AllRoutesStats;
  isLoading: boolean;
  setDeliveries: (deliveries: AutoRouteItem[]) => void;
  autoRoutePlanData: MultiRouteOutput | undefined;
  handleCancelPolling: () => void;
  fileName: string;
  customKitchenLocation?: { lat: number; lng: number } | null;
  country: string;
};

// Hook parameter types
export interface UseRoutePlanParams {
  routeID: string;
  configSideBarValues: SidebarValues;
  simulateTriggered: boolean;
  resetSimulateTrigger: () => void;
}

// Stats types
export interface AllRoutesStats {
  simulatedDeliveryDuration: string;
  simulatedTime: string;
  simulatedDeliveriesCompleted: string;
  simulatedWithinWindow: string | number;
  actualDeliveryDuration: string;
  actualTime: string;
  actualDeliveriesCompleted: string;
  actualWithinWindow: string | number;
}

export interface SimulatedRoutesStats {
  simulatedTime: string;
  simulatedDeliveriesCompleted: string;
  simulatedWithinWindow: string | number;
}

export type UseAllRoutesParams = UseRoutePlanParams;
export type UseAutoRoutePlanParams = UseRoutePlanParams;
export type UseSimulatedRoutesParams = UseRoutePlanParams;

export interface ActualRouteDelivery {
  id: string;
  priority: number;
  name: string;
  lat?: number;
  lng?: number;
  deliveredAt?: string;
  deliveredLocationDistance?: number | null;
}

export interface SimulatedRouteDelivery {
  id: string;
  priority: number;
  name: string;
  lat?: number;
  lng?: number;
  projectedDeliveredAt?: string;
}

export interface RecalculateETAsParameters {
  startTime: string;
  endTime: string;
  averageDeliveryTime: number;
  travelDurationMultiple: number;
}
