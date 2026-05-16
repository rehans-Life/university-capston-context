import React, { useState, useContext, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Delivery, RouteItemAction } from '@calo/driver-types';
import { DDeliveryStatus } from '@calo/types';

import { BottomSheetRef } from '../../../components/BottomSheet';
import DeliveryContext from '../DeliveryContext';

import DeliveryAction from './DeliveryAction';
import DeliveryInformation from './DeliveryInformation';
import { styles } from './Styles';

interface DeliveryCardProps {
  item: Delivery;
  viewList?: string;
  searchText: string;
  isBorder?: boolean;
  selectedTab: number;
  shiftAction: RouteItemAction[] | undefined;
  setSelectedDelivery?: (value: Delivery) => void;
  actionModalRef?: React.RefObject<BottomSheetRef>;
  confirmationRef: React.RefObject<BottomSheetRef>;
  coolerBagModalRef: React.RefObject<BottomSheetRef>;
  coolerBagsRetrievedModalRef: React.RefObject<BottomSheetRef>;
  navigationToCoolerBagManagement: (delivery: Delivery) => void;
}

const DeliveryCard = ({
  item,
  searchText,
  selectedTab,
  isBorder = true,
  actionModalRef,
  setSelectedDelivery,
  shiftAction,
  confirmationRef,
  coolerBagModalRef,
  coolerBagsRetrievedModalRef,
  viewList = 'list',
  navigationToCoolerBagManagement
}: DeliveryCardProps) => {
  const { updateDelivery, handleCallUser, setShowShiftWarnPopUp, startedShift } = useContext(DeliveryContext);

  const [isLoading, setIsLoading] = useState(false);

  const handlePicked = useCallback(async () => {
    setIsLoading(true);
    try {
      await updateDelivery(item.id, {
        deliveryStatus: DDeliveryStatus.delivering
      });
    } finally {
      setIsLoading(false);
    }
  }, [item.id, updateDelivery]);

  const handleClickOnCard = useCallback(() => {
    if (!startedShift) {
      setShowShiftWarnPopUp(true);
    }
  }, [setShowShiftWarnPopUp, startedShift]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[styles.item, isBorder && styles.shadow]}
      onPress={handleClickOnCard}
      key={`${item.id}-${item.userId}`}
    >
      <View style={styles.mainView}>
        <DeliveryInformation
          item={item}
          viewList={viewList}
          searchText={searchText}
          selectedTab={selectedTab}
          shiftAction={shiftAction}
          handleCallUser={handleCallUser}
          key={`${item.id}-${item.userId} Information`}
        />
      </View>
      <DeliveryAction
        item={item}
        isLoading={isLoading}
        selectedTab={selectedTab}
        startedShift={startedShift}
        actionModalRef={actionModalRef}
        confirmationRef={confirmationRef}
        coolerBagModalRef={coolerBagModalRef}
        coolerBagsRetrievedModalRef={coolerBagsRetrievedModalRef}
        handlePicked={() => handlePicked()}
        key={`${item.id}-${item.userId} Action`}
        setSelectedDelivery={setSelectedDelivery}
        navigationToCoolerBagManagement={navigationToCoolerBagManagement}
      />
    </TouchableOpacity>
  );
};
export default DeliveryCard;
