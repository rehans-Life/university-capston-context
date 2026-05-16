import React from 'react';
import { View } from 'react-native';

import { Delivery } from '@calo/driver-types';
import { DDeliveryStatus } from '@calo/types';
import { BottomSheetRef } from '@components/BottomSheet';

import { Button } from '../../../components';

import { styles } from './Styles';

interface DeliveryActionProps {
  item: Delivery & { shouldReturnBag?: boolean; unreturnedCoolerBags?: number };
  isLoading: boolean;
  selectedTab: number;
  startedShift: boolean;
  handlePicked: () => Promise<void>;
  confirmationRef: React.RefObject<BottomSheetRef>;
  actionModalRef: React.RefObject<BottomSheetRef> | undefined;
  coolerBagModalRef: React.RefObject<BottomSheetRef>;
  setSelectedDelivery: ((value: Delivery) => void) | undefined;
  coolerBagsRetrievedModalRef?: React.RefObject<BottomSheetRef>;
  navigationToCoolerBagManagement: (delivery: Delivery) => void;
}

const DeliveryAction = ({
  item,
  selectedTab,
  isLoading,
  startedShift,
  handlePicked,
  confirmationRef,
  setSelectedDelivery,
  actionModalRef,
  navigationToCoolerBagManagement
}: DeliveryActionProps) => {
  const isDelivered = item.deliveryStatus === DDeliveryStatus.delivered;
  const isPicked = item.deliveryStatus;

  return (
    <>
      {startedShift && !isPicked && (
        <View style={{ paddingVertical: 12 }}>
          <Button onButtonPress={() => handlePicked()} buttonText="PICK FOR DELIVERY" type="primary" disabled={isLoading} />
        </View>
      )}

      {startedShift && isPicked && (
        <View style={[styles.actionsButton, { display: item.deliveryStatus ? 'flex' : 'none' }]}>
          <Button
            customButtonStyle={{
              width: isDelivered ? '100%' : '50%',
              display: selectedTab === 1 ? 'none' : 'flex'
            }}
            customTextStyle={{ fontWeight: '700' }}
            onButtonPress={() => {
              setSelectedDelivery!(item);
              actionModalRef!.current?.open();
            }}
            buttonText="Actions"
            type="outlined"
          />
          <Button
            customTextStyle={{ fontWeight: '700' }}
            customButtonStyle={{
              width: selectedTab === 1 ? '100%' : '48%',
              display: item.deliveryStatus === DDeliveryStatus.delivered ? 'none' : 'flex',
              marginLeft: 12
            }}
            onButtonPress={() => {
              setSelectedDelivery!(item);
              if (item.shouldReturnBag) {
                navigationToCoolerBagManagement(item);
              } else {
                confirmationRef.current?.open();
              }
            }}
            buttonText="Delivered"
            type="outlined"
          />
        </View>
      )}
    </>
  );
};
export default DeliveryAction;
