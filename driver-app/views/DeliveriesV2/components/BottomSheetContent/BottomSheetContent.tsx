/**
 * BottomSheetContent Component
 * ============================
 *
 * PURPOSE:
 * Content for the deliveries bottom sheet.
 * Handles both collapsed and expanded views.
 */

import React from 'react';
import { View } from 'react-native';

import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Delivery } from '@calo/driver-types';

import FloatingStatusTabs from '../../FloatingStatusTabs';

import { CollapsedView } from './CollapsedView';
import { ExpandedView } from './ExpandedView';
import { styles } from './styles';
import { BottomSheetContentProps } from './types';
import { useBottomSheetContent } from './useBottomSheetContent';

export const BottomSheetContent = ({
  bottomSheetIndex,
  filteredDeliveries,
  selectedTab,
  statusCounts,
  searchText,
  firstCardHeight,
  deliveryDistances,
  onTabSelect,
  onSearchChange,
  onStartDelivery,
  onCardLayout,
  searchInputRef,
  onOpenDriverImages,
  setSelectedDelivery,
  navigateToCoolerBagManagement,
  onOpenActionModal,
  onOpenWhatsApp,
  shiftRoute,
  onOutOfSequenceDelivery,
  checkIfOutOfSequence,
  deliveriesListRef
}: BottomSheetContentProps) => {
  const isExpanded = bottomSheetIndex === 1;
  const { loadingDeliveryId, handleStartDelivery } = useBottomSheetContent(
    onStartDelivery,
    onOutOfSequenceDelivery,
    checkIfOutOfSequence
  );

  const onPressDelivered = (delivery: Delivery) => {
    if (selectedTab === 1 && onOutOfSequenceDelivery) {
      onOutOfSequenceDelivery(delivery.id);
    } else {
      if (delivery.shouldReturnBag) {
        navigateToCoolerBagManagement(delivery);
      } else {
        setSelectedDelivery(delivery);
      }
    }
  };

  return (
    <View style={styles.container}>
      {isExpanded ? (
        <ExpandedView
          deliveriesListRef={deliveriesListRef}
          deliveries={filteredDeliveries}
          loadingDeliveryId={loadingDeliveryId}
          searchText={searchText}
          selectedTab={selectedTab}
          statusCounts={statusCounts}
          deliveryDistances={deliveryDistances}
          searchInputRef={searchInputRef}
          onSearchChange={onSearchChange}
          onTabSelect={onTabSelect}
          onStartDelivery={handleStartDelivery}
          onOpenDriverImages={onOpenDriverImages}
          setSelectedDelivery={setSelectedDelivery}
          onPressDelivered={onPressDelivered}
          onOpenActionModal={onOpenActionModal}
          onOpenWhatsApp={onOpenWhatsApp}
          shiftRoute={shiftRoute}
        />
      ) : (
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.collapsedContainer}>
          <View style={styles.tabsWrapper}>
            <FloatingStatusTabs selectedTab={selectedTab} tabsTotalLength={statusCounts} onSelectStatus={onTabSelect} />
          </View>
          <CollapsedView
            delivery={filteredDeliveries[0] || null}
            loadingDeliveryId={loadingDeliveryId}
            searchText={searchText}
            selectedTab={selectedTab}
            firstCardHeight={firstCardHeight}
            deliveryDistances={deliveryDistances}
            onStartDelivery={handleStartDelivery}
            onCardLayout={onCardLayout}
            onOpenDriverImages={onOpenDriverImages}
            setSelectedDelivery={setSelectedDelivery}
            onPressDelivered={onPressDelivered}
            onOpenActionModal={onOpenActionModal}
            onOpenWhatsApp={onOpenWhatsApp}
            shiftRoute={shiftRoute}
          />
        </BottomSheetScrollView>
      )}
    </View>
  );
};
