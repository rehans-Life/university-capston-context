/**
 * DeliveriesV2 Component
 * =======================
 *
 * PURPOSE:
 * Main delivery navigation screen with Google Maps-style interface.
 * Shows driver location, delivery stops.
 *
 * ARCHITECTURE:
 * This is a PURE PRESENTATION component. All logic is handled by hooks:
 * - useDeliveriesV2UI: Core delivery/shift/navigation logic
 * - useSubActions: Sub-action modal handling
 * - useDriverImagesModal: Driver images preview
 * - useWhatsAppOptions: WhatsApp contact options
 * - useOutOfSequence: Out-of-sequence delivery handling
 * - useDeliveryDetailsModal: Map marker delivery details
 */

import React, { useLayoutEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';

import type { BottomSheetFlatListMethods } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Components
import {
  Button as CustomButton,
  FinishedShiftPanel,
  Layout,
  LocationPermissionPopup,
  LocationPopup,
  PODCaptureModal,
  PopUp
} from '@components';
import { BottomSheet } from '@components/BottomSheet';
import {
  AccountSettingBottomSheet,
  ActionBottomSheet,
  UnableToDeliverBottomSheet,
  UpdateDeliveryBottomSheet
} from '@components/BottomSheet/BottomSheetsComponents';
import ConfirmationBottomSheet from '@components/BottomSheet/BottomSheetsComponents/ConfirmationBottomSheet/ConfirmationBottomSheet';
import SubActionBottomSheetV2 from '@components/BottomSheet/BottomSheetsComponents/SubActionBottomSheet/SubActionBottomSheetV2';
import DeliveryDetailsModal from '@components/DeliveryDetailsModal';
import { colors } from '@components/theme';
import { MainStackParamList } from '@navigation/types';

import WhatsAppOptionsSheet from '../Deliveries/DeliveryCard/WhatsAppOptionsSheet';
import DeliveryTimeBottomSheet from '../Deliveries/Header/DeliveryTimeBottomSheet';

import { BottomSheetContent, DeliveryMapView, DriverImagesModal, ReasonPopup } from './components';
import DeliveriesV2Header from './DeliveriesV2Header';
import {
  useDeliveriesV2UI,
  useDeliveryDetailsModal,
  useDriverImagesModal,
  useOutOfSequence,
  useSubActions,
  useWhatsAppOptions
} from './hooks';
import { styles } from './styles';

const DeliveriesV2 = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'DeliveriesV2'>>();
  const deliveriesListRef = useRef<BottomSheetFlatListMethods>(null);

  const {
    // Refs
    mapRef,
    bottomSheetRef,
    searchInputRef,
    deliveryTimeBottomSheetRef,
    accountSettingRef,
    confirmationRef,

    // State - Deliveries
    filteredDeliveries,
    deliverySequenceMap,
    statusCounts,

    // State - Navigation
    driverLocation,
    isBearingReady,
    deliveryDistances,

    // State - Routes
    activeRoute,
    staticRouteSegments,
    isStaticRoutesLoading,

    // State - UI
    bottomSheetIndex,
    firstCardHeight,
    snapPoints,
    selectedTab,
    searchText,
    shouldShowBottomSheet,

    // State - Modals & Popups
    finishShiftPopUp,
    showShiftWarnPopUp,
    showLocationPopup,
    permissionIssue,
    isSupported,
    showFarFromDeliveryPopUp,
    farFromDeliveryDistance,
    isFarFromDeliveryLoading,
    handleConfirmFarFromDelivery,
    handleCancelFarFromDelivery,
    selectedDelivery,
    setSelectedDelivery,

    // State - Filters & Settings
    filters,
    shift,
    shiftLoading,
    isShiftFinished,
    currentDriver,
    displayCustomMarkers,

    // Handlers - Delivery Actions
    startDelivery,
    checkIfOutOfSequence,
    handleDelivered,
    navigateToCoolerBagManagement,
    handleAddingNote,
    requestAddressChange,

    // Handlers - UI Actions
    setSelectedTab,
    setSearchText,
    expandAndFocusSearch,
    handleBottomSheetChange,
    setFirstCardHeight,
    handleDeliveryTimeChange,
    openAccountSettings,

    // Handlers - System Actions
    handleLogout,
    handleSkipShift,
    handleFinishShift,
    continueShift,
    openLink,
    setFinishShiftPopUp,
    setShowShiftWarnPopUp,
    setDisplayCustomMarkers,
    checkLocationPermission,
    openLocationSettings,

    // Functions - Delivery Filtering
    countFilteredDeliveries,

    // Functions - Data Refetching
    refetchShift,
    refetch,

    // State - Routes
    shiftRoute,

    // State - POD Modal
    isPODModalVisible,
    podDelivery,
    handlePODConfirm,
    handlePODCancel,
    handlePODSkip
  } = useDeliveriesV2UI();

  // ========================================
  // SUB-ACTION HOOK - Action modals
  // ========================================
  const {
    // Refs
    actionModalRef,
    updateDeliveryModalRef,
    unableToDeliverModalRef,
    subActionRef,
    isOpeningActionModalRef,

    // State
    subActionsInfo,
    updatePinLocationPopup,
    setUpdatePinLocationPopup,

    // Handlers
    handleSubActionData,
    handleConfirmAction,
    handleOnCloseSheet,
    handleRefresh,
    handleOpenActionModal
  } = useSubActions({
    selectedDelivery,
    setSelectedDelivery,
    filteredDeliveries,
    startDelivery,
    handleAddingNote,
    requestAddressChange,
    refetch,
    refetchShift
  });

  // ========================================
  // DRIVER IMAGES MODAL HOOK
  // ========================================
  const { isDriverImagesModalVisible, selectedDriverImagesDelivery, openDriverImagesModal, closeDriverImagesModal } =
    useDriverImagesModal();

  // ========================================
  // WHATSAPP OPTIONS HOOK
  // ========================================
  const { isWhatsAppOptionsVisible, selectedWhatsAppDelivery, openWhatsAppOptions, closeWhatsAppOptions } = useWhatsAppOptions();

  // ========================================
  // OUT OF SEQUENCE HOOK
  // ========================================
  const {
    isOutOfSequencePopupVisible,
    outOfSequenceDelivery,
    isOutOfSequenceLoading,
    handleOutOfSequenceDelivery,
    handleConfirmOutOfSequence,
    handleCancelOutOfSequence
  } = useOutOfSequence({
    filteredDeliveries,
    selectedTab,
    startDelivery,
    handleDelivered,
    refetchShift,
    deliveriesListRef
  });

  // ========================================
  // DELIVERY DETAILS MODAL HOOK
  // ========================================
  const {
    isDeliveryDetailsModalVisible,
    selectedDeliveryForDetails,
    handleMarkerPress,
    closeDeliveryDetailsModal,
    handleCallUser
  } = useDeliveryDetailsModal();

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
          filters={filters}
          shiftLoading={shiftLoading}
          deliveryTimeBottomSheetRef={deliveryTimeBottomSheetRef}
          country={currentDriver.country}
          onSearchPress={expandAndFocusSearch}
          onMenuPress={openAccountSettings}
        />
      ),
      headerTransparent: true,
      headerStyle: {
        backgroundColor: 'transparent'
      }
    });
  }, [
    navigation,
    filters,
    shiftLoading,
    deliveryTimeBottomSheetRef,
    expandAndFocusSearch,
    openAccountSettings,
    currentDriver.country
  ]);

  /**
   * Open confirmation bottom sheet when selectedDelivery is set
   * Uses useLayoutEffect for synchronous execution after DOM updates
   * and requestAnimationFrame to ensure the ref is available
   * Only opens if we're not opening the action modal
   */
  useLayoutEffect(() => {
    // Only open confirmation modal if we're not opening the action modal
    if (selectedDelivery && !isOpeningActionModalRef.current) {
      // Use requestAnimationFrame to ensure the component is fully mounted
      requestAnimationFrame(() => {
        if (confirmationRef.current) {
          confirmationRef.current.open();
        }
      });
    }
  }, [selectedDelivery, confirmationRef, isOpeningActionModalRef]);

  // ========================================
  // RENDER
  // ========================================

  // Show FinishedShiftPanel when shift is finished, not on delivered tab, and no search text
  if (isShiftFinished && selectedTab !== 2 && searchText.length === 0) {
    return (
      <Layout topBar style={styles.container}>
        <FinishedShiftPanel
          continueShift={continueShift}
          currentDriver={currentDriver.name}
          deliveries={countFilteredDeliveries(2)}
          doneDeliveries={statusCounts.delivered}
          totalDeliveries={statusCounts.new + statusCounts.pending}
        />
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      {/* Map View: show loader until location and bearing are ready */}
      {!driverLocation || !isBearingReady ? (
        <View style={mapLoadingStyles.container}>
          <ActivityIndicator size="large" />
          <Text style={mapLoadingStyles.text}>{driverLocation ? 'Getting your direction...' : 'Getting your location...'}</Text>
        </View>
      ) : (
        <DeliveryMapView
          mapRef={mapRef}
          driverLocation={driverLocation}
          filteredDeliveries={filteredDeliveries}
          activeRoute={activeRoute}
          staticRouteSegments={staticRouteSegments}
          isStaticRoutesLoading={isStaticRoutesLoading}
          deliverySequenceMap={deliverySequenceMap}
          onMarkerPress={handleMarkerPress}
        />
      )}

      {/* Bottom Sheet */}
      {shouldShowBottomSheet && (
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          dynamicHeight={false}
          handleIndicator="flex"
          enablePanDownToClose={false}
          enableContentPanningGesture={true}
          enableHandlePanningGesture={true}
          onChange={handleBottomSheetChange}
          isBackdropRendered={false}
          initialIndex={0}
          skipScrollView={true}
        >
          <BottomSheetContent
            bottomSheetIndex={bottomSheetIndex}
            filteredDeliveries={filteredDeliveries}
            selectedTab={selectedTab}
            statusCounts={statusCounts}
            searchText={searchText}
            firstCardHeight={firstCardHeight}
            deliveryDistances={deliveryDistances}
            onTabSelect={setSelectedTab}
            onSearchChange={setSearchText}
            onStartDelivery={startDelivery}
            onCardLayout={setFirstCardHeight}
            searchInputRef={searchInputRef}
            onOpenDriverImages={openDriverImagesModal}
            setSelectedDelivery={setSelectedDelivery}
            navigateToCoolerBagManagement={navigateToCoolerBagManagement}
            onOpenActionModal={handleOpenActionModal}
            onOpenWhatsApp={openWhatsAppOptions}
            shiftRoute={shiftRoute}
            onOutOfSequenceDelivery={handleOutOfSequenceDelivery}
            checkIfOutOfSequence={checkIfOutOfSequence}
            deliveriesListRef={deliveriesListRef}
          />
        </BottomSheet>
      )}

      {/* Confirmation Bottom Sheet */}
      <ConfirmationBottomSheet
        modelRef={confirmationRef}
        desc="Are you sure you would like to mark this delivery as delivered ?"
        selectedDelivery={selectedDelivery}
        title="Confirm Delivery"
        handleDelivered={handleDelivered}
        onClose={() => {
          setSelectedDelivery(undefined);
          confirmationRef.current?.close();
        }}
      />

      {/* Out of Sequence Reason Popup */}
      <ReasonPopup
        visible={isOutOfSequencePopupVisible}
        title="Out of Sequence Delivery"
        message={`You are trying to pick up delivery ${outOfSequenceDelivery?.shortId || ''} out of sequence. Please provide a reason why you want to deliver this out of sequence.`}
        onConfirm={handleConfirmOutOfSequence}
        onCancel={handleCancelOutOfSequence}
        loading={isOutOfSequenceLoading}
      />

      {/* Far from Delivery Location Reason Popup */}
      {showFarFromDeliveryPopUp && (
        <ReasonPopup
          visible={true}
          title="Far from delivery location"
          message={
            <Text style={styles.farFromDeliveryMessage}>
              You are <Text style={styles.farFromDeliveryDistance}>{farFromDeliveryDistance}</Text> meters away from the delivery
              location. Do you still want to mark this as delivered? Please provide a reason.
            </Text>
          }
          onConfirm={handleConfirmFarFromDelivery}
          onCancel={handleCancelFarFromDelivery}
          loading={isFarFromDeliveryLoading}
        />
      )}

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
        displayCustomMarkers={displayCustomMarkers}
        modelRef={accountSettingRef}
        setDisplayCustomMarkers={setDisplayCustomMarkers}
      />

      {/* Action Bottom Sheet */}
      <ActionBottomSheet
        selectedDelivery={selectedDelivery}
        modelRef={actionModalRef}
        updateDeliveryModalRef={updateDeliveryModalRef}
        unableToDeliverModalRef={unableToDeliverModalRef}
        onClose={() => {
          setSelectedDelivery(undefined);
          actionModalRef.current?.close();
        }}
      />

      {/* Unable to Deliver Bottom Sheet */}
      <UnableToDeliverBottomSheet handleSubActionData={handleSubActionData} modelRef={unableToDeliverModalRef} />

      {/* Update Delivery Bottom Sheet */}
      <UpdateDeliveryBottomSheet handleSubActionData={handleSubActionData} modelRef={updateDeliveryModalRef} />

      {/* Sub Action Bottom Sheet */}
      <SubActionBottomSheetV2
        modelRef={subActionRef}
        actionInfo={subActionsInfo}
        allowPhotographicNotes={shift?.allowPhotographicNotes || false}
        selectedDelivery={selectedDelivery}
        handleConfirmAction={handleConfirmAction}
        handleOnCloseSheet={handleOnCloseSheet}
        handleAddingNote={handleAddingNote}
        handleRefresh={handleRefresh}
      />

      {/* App Version Popup */}
      {!isSupported && (
        <PopUp
          visible={!isSupported}
          cancelPress={BackHandler.exitApp}
          confirmPress={BackHandler.exitApp}
          customButton={() => <CustomButton buttonText="OK" onButtonPress={openLink} type="success" />}
          popUpText="We've released a new version of the app. Make sure to download the latest one."
        />
      )}

      {/* Finish Shift Popup */}
      {finishShiftPopUp && (
        <PopUp
          visible={finishShiftPopUp}
          cancelPress={() => setFinishShiftPopUp(false)}
          confirmPress={handleFinishShift}
          popUpText={`You have ${statusCounts.new + statusCounts.pending} deliveries left, would you like to proceed?`}
        />
      )}

      {/* Shift Warning Popup */}
      {showShiftWarnPopUp && (
        <PopUp
          visible={showShiftWarnPopUp}
          cancelPress={() => setShowShiftWarnPopUp(false)}
          confirmPress={() => setShowShiftWarnPopUp(false)}
          customButton={() => <CustomButton buttonText="Ok" onButtonPress={() => setShowShiftWarnPopUp(false)} type="success" />}
          popUpText="Click on Start shift to be able to start your journey."
        />
      )}

      {/* Location Permission Popup */}
      <LocationPermissionPopup
        visible={showLocationPopup}
        permissionIssue={permissionIssue}
        onOpenSettings={openLocationSettings}
        onRetry={checkLocationPermission}
      />

      {/* Driver Images Modal */}
      <DriverImagesModal
        visible={isDriverImagesModalVisible}
        delivery={selectedDriverImagesDelivery}
        onClose={closeDriverImagesModal}
      />

      {/* Location Popup for Pin Location Updates */}
      {updatePinLocationPopup && selectedDelivery && (
        <LocationPopup
          selectedUserIdForAddressChange={selectedDelivery.id}
          setSelectedUserIdForAddressChange={() => setUpdatePinLocationPopup(false)}
        />
      )}

      {/* WhatsApp Options Sheet */}
      <WhatsAppOptionsSheet isVisible={isWhatsAppOptionsVisible} onClose={closeWhatsAppOptions} item={selectedWhatsAppDelivery} />

      {/* Delivery Details Modal */}
      {selectedDeliveryForDetails && (
        <DeliveryDetailsModal
          delivery={selectedDeliveryForDetails}
          isVisible={isDeliveryDetailsModalVisible}
          onClose={closeDeliveryDetailsModal}
          onCallUser={handleCallUser}
        />
      )}

      <PODCaptureModal
        visible={isPODModalVisible}
        delivery={podDelivery}
        onConfirm={handlePODConfirm}
        onCancel={handlePODCancel}
        onSkip={handlePODSkip}
      />
    </Layout>
  );
};

const mapLoadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey[100],
    paddingBottom: 100
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: colors.grey[600]
  }
});

export default DeliveriesV2;
