import React, { useContext, useState } from 'react';

import { Delivery, LatLng, PreferredRouteItem, ShiftActions, ShiftActionType } from '@calo/driver-types';
import { getCurPos } from '@helpers';
import { DeliveryTime } from '@lib/enums';

import { VanData } from '../../../types/interfaces';
import DeliveryContext from '../DeliveryContext';

import ManualRoute from './ManualRoute';
import VanDataPanel from './VanDataPanel';

interface PreferredRouteMapProps {
  deliveries: Delivery[];
  handleUpdateShift: (action: ShiftActions, preferredRoute: PreferredRouteItem[] | undefined, driverPos: LatLng) => Promise<void>;
  setSnapPointIndex: (point: number) => void;
  driverName: string;
  deliveryTime: DeliveryTime;
  isAutoRouteEnabled: boolean;
}

const PreferredRouteMap = ({
  deliveries,
  handleUpdateShift,
  setSnapPointIndex,
  driverName,
  deliveryTime,
  isAutoRouteEnabled
}: PreferredRouteMapProps) => {
  const [vanData, setVanData] = useState<VanData>({});
  const [isVanPanelVisible, setIsVanPanelVisible] = useState(true);
  const [isShiftLoading, setIsShiftLoading] = useState<boolean>(false);
  const { isInSetRouteStage, setIsInSetRouteStage } = useContext(DeliveryContext);

  const startDelivering = async () => {
    setIsShiftLoading(true);
    const curPos: { latitude: number; longitude: number } = await getCurPos();
    const prefRoute = undefined;

    const action: ShiftActions = {
      type: ShiftActionType.STARTED_DELIVERING,
      time: new Date().toISOString(),
      vanData
    };

    const currentPosition: LatLng = {
      lat: curPos.latitude,
      lng: curPos.longitude
    };

    await handleUpdateShift(action, prefRoute, currentPosition);
    setIsShiftLoading(false);
    setIsInSetRouteStage(false);
  };

  const onPressDone = () => {
    if (isAutoRouteEnabled) {
      startDelivering();
    } else {
      // show manual route panel
      setIsVanPanelVisible(false);
    }
  };

  if (isVanPanelVisible) {
    return (
      <VanDataPanel
        currentDriver={driverName}
        deliveryTime={deliveryTime}
        setVanData={setVanData}
        totalDeliveries={deliveries.length}
        onPressDone={onPressDone}
        vanData={vanData}
        isShiftLoading={isShiftLoading}
      />
    );
  } else {
    return (
      <ManualRoute
        deliveries={deliveries}
        handleUpdateShift={handleUpdateShift}
        setSnapPointIndex={setSnapPointIndex}
        driverName={driverName}
        deliveryTime={deliveryTime}
        vanData={vanData}
        isVanPanelVisible={isVanPanelVisible}
        isShiftLoading={isShiftLoading}
        setIsShiftLoading={setIsShiftLoading}
        setIsInSetRouteStage={setIsInSetRouteStage}
        isInSetRouteStage={isInSetRouteStage}
      />
    );
  }
};

export default PreferredRouteMap;
