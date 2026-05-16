import React from 'react';
import { View } from 'react-native';

import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { BottomSheetFlatListMethods } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types';

import { Delivery, RouteItem } from '@calo/driver-types';

import DeliveryCard from '../../DeliveryCard';

import { EmptyState } from './EmptyState';
import { styles } from './styles';

interface DeliveriesListProps {
  deliveries: Delivery[];
  loadingDeliveryId: string | null;
  searchText: string;
  selectedTab: number;
  deliveryDistances?: Record<string, number>;
  onStartDelivery: (deliveryId: string) => void;
  onOpenDriverImages: (delivery: Delivery) => void;
  setSelectedDelivery: (delivery: Delivery) => void;
  onPressDelivered: (delivery: Delivery) => void;
  onOpenActionModal?: (delivery: Delivery) => void;
  onOpenWhatsApp?: (delivery: Delivery) => void;
  shiftRoute?: Record<string, RouteItem>;
  deliveriesListRef: React.RefObject<BottomSheetFlatListMethods>;
}

export const DeliveriesList: React.FC<DeliveriesListProps> = ({
  deliveries,
  loadingDeliveryId,
  searchText,
  selectedTab,
  deliveryDistances,
  onStartDelivery,
  onOpenDriverImages,
  setSelectedDelivery,
  onPressDelivered,
  onOpenActionModal,
  onOpenWhatsApp,
  shiftRoute,
  deliveriesListRef
}) => {
  const renderItem = ({ item: delivery }: { item: Delivery }) => {
    const shiftAction = shiftRoute?.[delivery.id]?.actions;

    return (
      <View style={styles.deliveryCardWrapper}>
        <DeliveryCard
          isLoading={loadingDeliveryId === delivery.id}
          delivery={delivery}
          distanceMeters={deliveryDistances?.[delivery.id]}
          onPressDelivered={() => onPressDelivered(delivery)}
          showButton={true}
          onStartDelivery={() => onStartDelivery(delivery.id)}
          searchText={searchText}
          selectedTab={selectedTab}
          onOpenDriverImages={onOpenDriverImages}
          setSelectedDelivery={setSelectedDelivery}
          onOpenActionModal={() => onOpenActionModal?.(delivery)}
          onOpenWhatsApp={() => onOpenWhatsApp?.(delivery)}
          shiftAction={shiftAction}
        />
      </View>
    );
  };

  return (
    <BottomSheetFlatList
      ref={deliveriesListRef}
      data={deliveries}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={<EmptyState icon="search-off" text="No deliveries found" subtext="Try adjusting your search" />}
    />
  );
};
