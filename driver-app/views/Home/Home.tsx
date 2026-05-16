/**
 * Home Component
 * ==============
 *
 * PURPOSE:
 * Main landing screen with DeliveriesV2 header showing all deliveries for selected shift.
 *
 * ARCHITECTURE:
 * This is a pure presentation component. All logic is handled by useHomeUI hook.
 *
 * ORGANIZATION:
 * - Logic: ./hooks/useHomeUI.ts
 * - Styles: ./styles.ts
 */

import React, { useLayoutEffect } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Text } from '@ui-kitten/components/ui';

import { Delivery, LatLng, ShiftActions, ShiftActionType } from '@calo/driver-types';
import { Button, Layout, FinishedShiftPanel } from '@components';
import { AccountSettingBottomSheet } from '@components/BottomSheet/BottomSheetsComponents';
import { handleErrorCheck } from '@helpers';
import { GREEN_COLOR, PreferredRouteItem } from '@types';

import DeliveryTimeBottomSheet from '../Deliveries/Header/DeliveryTimeBottomSheet';
import { ShiftControllerV2 } from '../Deliveries/ShiftController';
import { EmptyState } from '../DeliveriesV2/components/BottomSheetContent/EmptyState';
import { ExpandedViewHeader } from '../DeliveriesV2/components/BottomSheetContent/ExpandedViewHeader';
import DeliveriesV2Header from '../DeliveriesV2/DeliveriesV2Header';
import DeliveryCard from '../DeliveriesV2/DeliveryCard';

import HomePreferredRouteMap from './HomePreferredRouteMap';
import { useHomeUI } from './hooks';
import { styles } from './styles';
import { HomeNavigationProp } from './types';

const Home: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();

  // ========================================
  // GET ALL LOGIC FROM CUSTOM HOOK
  // ========================================

  const {
    // Refs
    deliveryTimeBottomSheetRef,
    accountSettingRef,

    // State - Deliveries
    filteredDeliveries,
    searchText,

    // State - Shift
    shift,
    shiftLoading,
    isShiftStarted,
    isShiftFinished,
    snapPointIndex,
    setSnapPointIndex,
    isInSetRouteStage,
    setIsInSetRouteStage,

    // State - Filters
    filters,
    isLoading,
    currentDriver,

    // Handlers - Shift Actions
    handleDeliveryTimeChange,
    onStartDeliveringDeliveries,
    onStartShift,
    selectPreferredRoute,
    startShift,
    isStartingShift,
    kitchenModal,
    setKitchenModal,
    distance,

    // Handlers - UI Actions
    openAccountSettings,
    handleLogout,
    handleSkipShift,
    handleStartDelivering,
    continueShift,
    startDelivery,

    // Functions - Delivery Filtering
    getDeliveredDeliveries,
    statusCounts,

    // Functions - Data Refetching
    refetch
  } = useHomeUI();

  // ========================================
  // EFFECTS - UI Only
  // ========================================

  /**
   * Set navigation header dynamically
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <DeliveriesV2Header
          country={currentDriver.country}
          filters={filters}
          shiftLoading={shiftLoading}
          deliveryTimeBottomSheetRef={deliveryTimeBottomSheetRef}
          onMenuPress={openAccountSettings}
        />
      ),
      headerTransparent: true,
      headerStyle: {
        backgroundColor: 'transparent'
      }
    });
  }, [navigation, filters, shiftLoading, deliveryTimeBottomSheetRef, openAccountSettings, currentDriver.country]);

  // ========================================
  // RENDER HELPERS
  // ========================================

  const renderDeliveryItem = ({ item: delivery }: { item: Delivery }) => (
    <View style={styles.deliveryCardWrapper}>
      <DeliveryCard
        isLoading={false}
        delivery={delivery}
        onPressDelivered={() => {}}
        showButton={false}
        onStartDelivery={() => {}}
        searchText={searchText}
        onOpenDriverImages={() => {}}
        onOpenActionModal={() => {}}
      />
    </View>
  );

  // Check if shift is started with STARTED_DELIVERING action
  const isShiftStartedDelivering =
    isShiftStarted &&
    shift &&
    shift.driverActions.length > 0 &&
    shift.driverActions[shift.driverActions.length - 1]?.type === ShiftActionType.STARTED_DELIVERING;

  const renderListHeader = () => (
    <>
      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: 10 }]}>
        <ExpandedViewHeader deliveryCount={filteredDeliveries.length} driverName={currentDriver.name} />
      </View>

      {/* Search Input or Shift Started Message */}
      <View style={styles.searchWrapper}>
        {isShiftStartedDelivering ? (
          <View
            style={{
              backgroundColor: '#F0F9FF',
              borderRadius: 8,
              padding: 16,
              borderWidth: 1,
              borderColor: GREEN_COLOR
            }}
          >
            <Text style={{ fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
              Your shift has been started successfully. Click the button below to start delivering.
            </Text>
            <Button
              buttonText="Start Delivering"
              onButtonPress={handleStartDelivering}
              type="success"
              customButtonStyle={{
                backgroundColor: GREEN_COLOR,
                borderColor: GREEN_COLOR,
                borderRadius: 8
              }}
              customTextStyle={{ color: 'white' }}
            />
          </View>
        ) : null}
      </View>
    </>
  );

  const renderListEmpty = () => (
    <EmptyState icon="search-off" text="No deliveries found" subtext="Try adjusting your search or shift" />
  );

  if (shiftLoading || isLoading) {
    return (
      <Layout style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GREEN_COLOR} />
      </Layout>
    );
  }

  const autoPickFirstDelivery = async () => {
    // Only auto-start if there are multiple deliveries
    // Don't auto-start if it's the only delivery to avoid triggering finish shift logic
    if (filteredDeliveries.length <= 1) {
      return;
    }

    const firstDelivery = filteredDeliveries[0];
    if (!firstDelivery) {
      return;
    }
    try {
      await startDelivery(firstDelivery.id);
      // Refetch deliveries to ensure the updated delivery status is available
      // before navigation happens in the useEffect
      await refetch();
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went wrong with Start Delivery');
    }
  };

  const onStartDelivering = async (
    action: ShiftActions,
    prefRoute: PreferredRouteItem[] | undefined, // this will be undefined for auto-routing, but we keep it as old components signature requires it. We can remove it once we refactor old components to not require prefRoute for auto-routing
    driverPosition?: LatLng
  ) => {
    try {
      await onStartDeliveringDeliveries(action, driverPosition);
      await autoPickFirstDelivery();
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went wrong with start delivering');
    }
  };

  const renderFinishedShift = () => (
    <FinishedShiftPanel
      continueShift={continueShift}
      currentDriver={currentDriver.name}
      deliveries={getDeliveredDeliveries()}
      doneDeliveries={statusCounts.delivered}
      totalDeliveries={statusCounts.new + statusCounts.pending}
    />
  );

  const renderActiveShift = () => {
    if (isInSetRouteStage) {
      return (
        <HomePreferredRouteMap
          deliveries={filteredDeliveries}
          driverName={currentDriver.name}
          deliveryTime={filters.deliveryTime}
          handleUpdateShift={onStartDelivering}
          setSnapPointIndex={setSnapPointIndex}
          isAutoRouteEnabled={true}
          isInSetRouteStage={isInSetRouteStage}
          setIsInSetRouteStage={setIsInSetRouteStage}
        />
      );
    }

    return (
      <>
        <FlatList
          data={filteredDeliveries}
          renderItem={renderDeliveryItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderListEmpty}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="automatic"
        />

        {/* Shift Controller */}
        <ShiftControllerV2
          shift={shift}
          driverName={currentDriver.name}
          snapPointIndex={snapPointIndex}
          isLoadingDeliveries={!isLoading}
          visible={!isShiftStarted && !isLoading}
          selectPreferredRoute={selectPreferredRoute}
          startShift={startShift}
          handleStartShift={onStartShift}
          isStartingShift={isStartingShift}
          kitchenModal={kitchenModal}
          setKitchenModal={setKitchenModal}
          distance={distance}
        />
      </>
    );
  };

  return (
    <Layout style={styles.container}>
      {isShiftFinished ? renderFinishedShift() : renderActiveShift()}
      {/* Delivery Time Bottom Sheet */}
      <DeliveryTimeBottomSheet
        modalRef={deliveryTimeBottomSheetRef}
        selectedDeliveryTime={filters.deliveryTime}
        onSelectDeliveryTime={handleDeliveryTimeChange}
      />

      {/* Account Settings Bottom Sheet */}
      <AccountSettingBottomSheet
        shift={shift}
        logout={handleLogout}
        skipShift={handleSkipShift}
        displayCustomMarkers={false}
        modelRef={accountSettingRef}
        setDisplayCustomMarkers={() => {}}
      />
    </Layout>
  );
};

export default Home;
