import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@ui-kitten/components';

import { Delivery, RouteItem } from '@calo/driver-types';
import { FinishedShiftPanel } from '@components';
import { BottomSheetRef } from '@components/BottomSheet';
import { DeliveryStatusCounts, Driver } from '@types';

import DeliveriesList from '../DeliveryList';
import DeliveryMap from '../DeliveryMap';

import { styles } from './styles';

interface DeliveryScreenStateControllerProps {
  isLoading: boolean;
  searchText: string;
  screenState: string;
  selectedTab: number;
  shiftLoading: boolean;
  isShiftStarted: boolean;
  isShiftFinished: boolean;
  displayCustomMarkers: boolean;
  deliveries: Delivery[];
  continueShift: () => Promise<void>;
  deliveriesData: Delivery[] | undefined;
  currentDriver: Driver;
  tabsTotalLength: DeliveryStatusCounts;
  filteredDeliveries: Delivery[];
  finishShift: () => Promise<void>;
  filterDeliveries: (tab?: number) => Delivery[];
  actionModalRef: React.RefObject<BottomSheetRef>;
  coolerBagModalRef: React.RefObject<BottomSheetRef>;
  shiftRoute: Record<string, RouteItem> | undefined;
  confirmationModalRef: React.RefObject<BottomSheetRef>;
  setSelectedDelivery: React.Dispatch<React.SetStateAction<Delivery | undefined>>;
  coolerBagsRetrievedModalRef: React.RefObject<BottomSheetRef>;
  navigationToCoolerBagManagement: (delivery: Delivery) => void;
}

const DeliveryScreenStateController = ({
  shiftLoading,
  isLoading,
  screenState,
  deliveriesData,
  currentDriver,
  continueShift,
  tabsTotalLength,
  isShiftFinished,
  filterDeliveries,
  finishShift,
  selectedTab,
  shiftRoute,
  filteredDeliveries,
  setSelectedDelivery,
  displayCustomMarkers,
  actionModalRef,
  confirmationModalRef,
  coolerBagModalRef,
  deliveries,
  isShiftStarted,
  searchText,
  coolerBagsRetrievedModalRef,
  navigationToCoolerBagManagement
}: DeliveryScreenStateControllerProps) => {
  const noDeliveriesText =
    screenState === 'list' &&
    (!deliveriesData || deliveriesData.length === 0 || !deliveries || deliveries.length === 0) &&
    searchText.length === 0;
  const noRemainingDeliveriesText =
    screenState === 'list' && filterDeliveries(selectedTab).length === 0 && searchText.length === 0;
  const finishedPanel =
    screenState === 'list' &&
    isShiftStarted &&
    !isShiftFinished &&
    selectedTab === 0 &&
    filterDeliveries(0).length === 0 &&
    filterDeliveries(1).length === 0 &&
    filterDeliveries(2).length > 0;
  const noResultText =
    screenState === 'list' &&
    filterDeliveries(selectedTab).length === 0 &&
    tabsTotalLength?.totalDeliveries > 0 &&
    searchText.length > 0;

  const noDeliveriesView = (message: string) => (
    <View style={styles.centeredView}>
      <Text style={styles.deliveriesTextIndicator}>{message}</Text>
    </View>
  );

  if (isLoading || shiftLoading) {
    return (
      <View style={styles.loadingIndicator}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (noDeliveriesText) {
    return noDeliveriesView('No Deliveries');
  }

  if (noResultText) {
    return noDeliveriesView('No Results');
  }

  if (noRemainingDeliveriesText) {
    return noDeliveriesView('No Remaining Deliveries');
  }

  if (finishedPanel && searchText.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', height: '100%' }}>
        <FinishedShiftPanel
          continueShift={continueShift}
          currentDriver={currentDriver.name}
          deliveries={filterDeliveries(2)}
          doneDeliveries={tabsTotalLength.delivered}
          totalDeliveries={tabsTotalLength.new + tabsTotalLength.pending}
        />
        <Button onPress={finishShift} style={styles.finishShiftButton} disabled={isLoading}>
          Finish Shift
        </Button>
      </View>
    );
  }

  if (isShiftFinished && selectedTab !== 2 && searchText.length === 0) {
    return (
      <FinishedShiftPanel
        continueShift={continueShift}
        currentDriver={currentDriver.name}
        deliveries={filterDeliveries(2)}
        doneDeliveries={tabsTotalLength.delivered}
        totalDeliveries={tabsTotalLength.new + tabsTotalLength.pending}
      />
    );
  }

  return (
    <>
      {screenState === 'list' ? (
        <DeliveriesList
          searchText={searchText}
          shiftAction={shiftRoute}
          selectedTab={selectedTab}
          deliveries={filteredDeliveries}
          setSelectedDelivery={setSelectedDelivery}
          actionModalRef={actionModalRef}
          confirmationRef={confirmationModalRef}
          coolerBagModalRef={coolerBagModalRef}
          coolerBagsRetrievedModalRef={coolerBagsRetrievedModalRef}
          navigationToCoolerBagManagement={navigationToCoolerBagManagement}
        />
      ) : (
        screenState === 'map' && (
          <DeliveryMap
            searchText={searchText}
            displayCustomMarkers={displayCustomMarkers}
            deliveries={filteredDeliveries}
            selectedTab={selectedTab}
            actionModalRef={actionModalRef}
            setSelectedDelivery={setSelectedDelivery}
            confirmationRef={confirmationModalRef}
            coolerBagModalRef={coolerBagModalRef}
            coolerBagsRetrievedModalRef={coolerBagsRetrievedModalRef}
            navigationToCoolerBagManagement={navigationToCoolerBagManagement}
            shiftAction={shiftRoute}
          />
        )
      )}
    </>
  );
};
export default DeliveryScreenStateController;
