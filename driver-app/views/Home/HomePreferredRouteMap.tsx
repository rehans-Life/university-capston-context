/**
 * HomePreferredRouteMap Wrapper
 * =============================
 *
 * PURPOSE:
 * Wrapper component that provides DeliveryContext for PreferredRouteMap
 * while keeping Home independent from DeliveryContext.
 *
 * This allows PreferredRouteMap (which uses DeliveryContext) to work
 * in Home without Home needing to use the full DeliveryContext.
 */

import React from 'react';

import { Delivery, LatLng, PreferredRouteItem, ShiftActions } from '@calo/driver-types';
import { DeliveryTime } from '@lib/enums';

import DeliveryContext, { initialDeliveryContextValue } from '../Deliveries/DeliveryContext';
import PreferredRouteMap from '../Deliveries/PreferredRouteMap';

interface HomePreferredRouteMapProps {
  deliveries: Delivery[];
  handleUpdateShift: (
    action: ShiftActions,
    prefRoute?: PreferredRouteItem[] | undefined,
    driverPosition?: LatLng
  ) => Promise<void>;
  setSnapPointIndex: (point: number) => void;
  driverName: string;
  deliveryTime: DeliveryTime;
  isAutoRouteEnabled: boolean;
  isInSetRouteStage: boolean;
  setIsInSetRouteStage: (value: boolean) => void;
}

const HomePreferredRouteMap: React.FC<HomePreferredRouteMapProps> = ({ isInSetRouteStage, setIsInSetRouteStage, ...props }) => {
  return (
    <DeliveryContext.Provider
      value={{
        ...initialDeliveryContextValue,
        isInSetRouteStage: isInSetRouteStage,
        setIsInSetRouteStage: setIsInSetRouteStage
      }}
    >
      <PreferredRouteMap {...props} />
    </DeliveryContext.Provider>
  );
};

export default HomePreferredRouteMap;
