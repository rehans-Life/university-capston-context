import React, { useContext } from 'react';
import { RefreshControl, StyleSheet, View, FlatList } from 'react-native';

import { Delivery, RouteItem } from '@calo/driver-types';

import { default as theme } from '../../../../custom-theme.json';
import { BottomSheetRef } from '../../../components/BottomSheet';
import DeliveryCard from '../DeliveryCard';
import DeliveryContext from '../DeliveryContext';

interface DeliveryListProps {
  searchText: string;
  deliveries: Delivery[];
  selectedTab: number;
  footerComponent?: () => React.JSX.Element;
  actionModalRef: React.RefObject<BottomSheetRef>;
  setSelectedDelivery: (value: Delivery) => void;
  shiftAction: Record<string, RouteItem> | undefined;
  confirmationRef: React.RefObject<BottomSheetRef>;
  coolerBagModalRef: React.RefObject<BottomSheetRef>;
  coolerBagsRetrievedModalRef: React.RefObject<BottomSheetRef>;
  navigationToCoolerBagManagement: (delivery: Delivery) => void;
}
const DeliveryList = ({
  deliveries,
  searchText,
  setSelectedDelivery,
  actionModalRef,
  footerComponent,
  selectedTab,
  shiftAction,
  confirmationRef,
  coolerBagModalRef,
  coolerBagsRetrievedModalRef,
  navigationToCoolerBagManagement
}: DeliveryListProps) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const { handleRefresh } = useContext(DeliveryContext);

  const onRefresh = async () => {
    setRefreshing(true);
    await handleRefresh();
    setRefreshing(false);
  };

  return (
    <View style={{ paddingVertical: 2, flex: 1 }}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={deliveries}
        ListFooterComponent={footerComponent}
        ListFooterComponentStyle={deliveries.length > 0 ? { marginTop: 20 } : { marginTop: '40%' }}
        renderItem={({ item }: { item: Delivery }) => (
          <DeliveryCard
            item={item}
            viewList="list"
            searchText={searchText}
            shiftAction={shiftAction ? shiftAction[item.id]?.actions : []}
            selectedTab={selectedTab}
            actionModalRef={actionModalRef}
            setSelectedDelivery={(del) => setSelectedDelivery(del)}
            confirmationRef={confirmationRef}
            coolerBagModalRef={coolerBagModalRef}
            coolerBagsRetrievedModalRef={coolerBagsRetrievedModalRef}
            navigationToCoolerBagManagement={navigationToCoolerBagManagement}
          />
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white'
  },
  contentContainer: {
    padding: 10
  },
  backdrop: {
    backgroundColor: theme['color-basic-transparent-400']
  },
  modal: {
    flex: 1
  }
});
export default DeliveryList;
