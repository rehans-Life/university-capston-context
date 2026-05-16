import React from 'react';
import { LayoutChangeEvent, View } from 'react-native';

import { Delivery, RouteItem } from '@calo/driver-types';

import DeliveryCard from '../../DeliveryCard';

import { EmptyState } from './EmptyState';
import { styles } from './styles';

interface CollapsedViewProps {
  delivery: Delivery & { shouldReturnBag?: boolean };
  loadingDeliveryId: string | null;
  searchText: string;
  selectedTab: number;
  firstCardHeight: number | null;
  deliveryDistances?: Record<string, number>;
  onStartDelivery: (deliveryId: string) => void;
  onCardLayout: (height: number) => void;
  onOpenDriverImages: (delivery: Delivery) => void;
  setSelectedDelivery: (delivery: Delivery) => void;
  onPressDelivered: (delivery: Delivery) => void;
  onOpenActionModal?: (delivery: Delivery) => void;
  onOpenWhatsApp?: (delivery: Delivery) => void;
  shiftRoute?: Record<string, RouteItem>;
}

export const CollapsedView: React.FC<CollapsedViewProps> = ({
  delivery,
  loadingDeliveryId,
  searchText,
  selectedTab,
  firstCardHeight,
  deliveryDistances,
  onStartDelivery,
  onCardLayout,
  onOpenDriverImages,
  setSelectedDelivery,
  onPressDelivered,
  onOpenActionModal,
  onOpenWhatsApp,
  shiftRoute
}) => {
  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (firstCardHeight === null || Math.abs(firstCardHeight - height) > 10) {
      onCardLayout(height);
    }
  };

  const shiftAction = delivery ? shiftRoute?.[delivery.id]?.actions : undefined;

  return (
    <View style={styles.collapsedCardWrapper} onLayout={handleLayout}>
      {delivery ? (
        <DeliveryCard
          isLoading={loadingDeliveryId === delivery.id}
          delivery={delivery}
          distanceMeters={delivery?.id ? deliveryDistances?.[delivery.id] : undefined}
          onPressDelivered={() => onPressDelivered(delivery)}
          onStartDelivery={() => onStartDelivery(delivery.id)}
          showButton={true}
          searchText={searchText}
          selectedTab={selectedTab}
          onOpenDriverImages={onOpenDriverImages}
          setSelectedDelivery={setSelectedDelivery}
          onOpenActionModal={() => onOpenActionModal?.(delivery)}
          onOpenWhatsApp={() => onOpenWhatsApp?.(delivery)}
          shiftAction={shiftAction}
        />
      ) : (
        <EmptyState icon="inbox" text="No deliveries in this tab" />
      )}
    </View>
  );
};
