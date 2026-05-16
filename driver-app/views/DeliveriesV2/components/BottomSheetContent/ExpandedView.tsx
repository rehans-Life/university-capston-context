import React from 'react';
import { View, TextInput } from 'react-native';

import type { BottomSheetFlatListMethods } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types';

import { Delivery, RouteItem } from '@calo/driver-types';

import { DeliveryStatusCounts } from '../../../../types/interfaces';

import { DeliveriesList } from './DeliveriesList';
import { ListHeader } from './ListHeader';
import { styles } from './styles';

interface ExpandedViewProps {
  deliveries: Delivery[];
  loadingDeliveryId: string | null;
  searchText: string;
  selectedTab: number;
  statusCounts: DeliveryStatusCounts;
  deliveryDistances?: Record<string, number>;
  searchInputRef: React.RefObject<TextInput>;
  onSearchChange: (text: string) => void;
  onTabSelect: (index: number) => void;
  onStartDelivery: (deliveryId: string) => void;
  onOpenDriverImages: (delivery: Delivery) => void;
  setSelectedDelivery: (delivery: Delivery | undefined) => void;
  onPressDelivered: (delivery: Delivery) => void;
  onOpenActionModal?: (delivery: Delivery) => void;
  onOpenWhatsApp?: (delivery: Delivery) => void;
  shiftRoute?: Record<string, RouteItem>;
  deliveriesListRef: React.RefObject<BottomSheetFlatListMethods>;
}

export const ExpandedView: React.FC<ExpandedViewProps> = ({
  deliveries,
  loadingDeliveryId,
  searchText,
  selectedTab,
  statusCounts,
  deliveryDistances,
  searchInputRef,
  onSearchChange,
  onTabSelect,
  onStartDelivery,
  onOpenDriverImages,
  setSelectedDelivery,
  onPressDelivered,
  onOpenActionModal,
  onOpenWhatsApp,
  shiftRoute,
  deliveriesListRef
}) => {
  return (
    <View style={styles.allDeliveriesContainer}>
      <ListHeader
        selectedTab={selectedTab}
        statusCounts={statusCounts}
        onTabSelect={onTabSelect}
        searchText={searchText}
        onSearchChange={onSearchChange}
        searchInputRef={searchInputRef}
      />
      <DeliveriesList
        deliveriesListRef={deliveriesListRef}
        deliveries={deliveries}
        loadingDeliveryId={loadingDeliveryId}
        searchText={searchText}
        selectedTab={selectedTab}
        deliveryDistances={deliveryDistances}
        onStartDelivery={onStartDelivery}
        onOpenDriverImages={onOpenDriverImages}
        setSelectedDelivery={setSelectedDelivery}
        onPressDelivered={onPressDelivered}
        onOpenActionModal={onOpenActionModal}
        onOpenWhatsApp={onOpenWhatsApp}
        shiftRoute={shiftRoute}
      />
    </View>
  );
};
