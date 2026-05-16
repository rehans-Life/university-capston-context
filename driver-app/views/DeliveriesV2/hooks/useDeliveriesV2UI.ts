/**
 * useDeliveriesV2UI Hook
 * ======================
 *
 * Main orchestration hook for DeliveriesV2 screen.
 * Separates ALL logic from the UI component, making DeliveriesV2.tsx purely presentational.
 *
 * ARCHITECTURE:
 * ┌────────────────────────────────────────────────────────────────┐
 * │  useDeliveriesV2UI (this hook)                                 │
 * │  ├── useUnifiedDeliveries (@hooks)                             │
 * │  │   └── All delivery data: fetching, filtering, state         │
 * │  ├── useDriverLocation                                         │
 * │  │   └── GPS tracking, driver position                         │
 * │  ├── useDeliveryRoutes                                         │
 * │  │   └── Route calculation for map                             │
 * │  ├── useNavigationCamera                                       │
 * │  │   └── Map camera control                                    │
 * │  ├── useBottomSheet                                            │
 * │  │   └── Bottom sheet UI state                                 │
 * │  ├── useDeliveryModals                                         │
 * │  │   └── Modal/popup states                                    │
 * │  └── Event Handlers                                            │
 * │      └── startDelivery, handleDelivered, handleAddingNote...   │
 * └────────────────────────────────────────────────────────────────┘
 *
 * USAGE:
 * const { filteredDeliveries, startDelivery, ... } = useDeliveriesV2UI();
 */

import { useEffect, useMemo, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { BackHandler, Linking } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { Auth } from 'aws-amplify';
import { getDistance } from 'geolib';
import IdleTimerManager from 'react-native-idle-timer';
import { Asset } from 'react-native-image-picker';
import MapView from 'react-native-maps';

import { updateAddress, addNote, updateShift, addActions, uploadPODImages } from '@actions';
import { Delivery, UpdateDeliveryReq, RouteItemActionType } from '@calo/driver-types';
import { DDeliveryStatus, Kitchen } from '@calo/types';
import { BottomSheetRef } from '@components/BottomSheet';
import { handleErrorCheck, snackbarShow, getInitDeliveryTime, getInitDeliveryDay } from '@helpers';
import {
  useLiveTracking,
  useDeliveryActions,
  useFinishShift,
  useAppVersionCheck,
  useLocationPermission,
  useRemoteConfig
} from '@hooks';
import useCurrentUser from '@hooks/useCurrentUser';
import useUnifiedDeliveries from '@hooks/useUnifiedDeliveries';
import { DeliveryTime } from '@lib/enums';
import { ROUTES } from '@navigation/types';

import { DeliveryFilters } from '../../../types/interfaces';
import { DeliveriesV2NavigationProp, DeliveriesV2RouteProp } from '../types';

// Custom hooks
import { useBottomSheet, useDeliveryModals, useDriverLocation, useDeliveryRoutes, useNavigationCamera } from './index';

export const useDeliveriesV2UI = () => {
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation<DeliveriesV2NavigationProp>();
  const route = useRoute<DeliveriesV2RouteProp>();

  const currentDriver = useCurrentUser();
  const { isSupported, newVersionLink, verifyVersion } = useAppVersionCheck();

  const [filters, setFilters] = useState<DeliveryFilters>({
    day: getInitDeliveryDay(),
    deliveryTime: route.params?.deliveryTime || getInitDeliveryTime(currentDriver.country)
  });

  // POD Modal State
  const [isPODModalVisible, setIsPODModalVisible] = useState(false);
  const [podDelivery, setPodDelivery] = useState<Delivery | null>(null);
  // Cooler bag attrs pending POD confirmation (set when navigating from CoolerBagManagement)
  const [pendingCoolerBagAttr, setPendingCoolerBagAttr] = useState<UpdateDeliveryReq | null>(null);

  const {
    // Raw data
    shift,
    shiftRoute,
    isShiftStarted,
    isShiftFinished,
    isShiftLoading: shiftLoading,

    // Deliveries
    filteredDeliveries,

    // Tab/Filter state
    selectedTab,
    setSelectedTab,
    searchText,
    setSearchText,

    // Counts & Mapping
    statusCounts,
    deliverySequenceMap,

    // Actions
    updateDelivery,
    dispatch,
    countFilteredDeliveries,

    // Refetch functions
    refetch,
    refetchShift
  } = useUnifiedDeliveries({ filters });

  const [stopLiveTracking, startLiveTracking] = useLiveTracking();

  const { maxDeliveryDistanceMeters } = useRemoteConfig(currentDriver.kitchen as Kitchen);
  const { showLocationPopup, permissionIssue, checkLocationPermission, openLocationSettings } = useLocationPermission({
    isShiftStarted: isShiftStarted,
    checkInterval: 120000
  });

  const {
    bottomSheetRef,
    searchInputRef,
    bottomSheetIndex,
    firstCardHeight,
    setFirstCardHeight,
    snapPoints,
    handleBottomSheetChange,
    expandAndFocusSearch
  } = useBottomSheet();

  const {
    finishShiftPopUp,
    setFinishShiftPopUp,
    showShiftWarnPopUp,
    setShowShiftWarnPopUp,
    deliveryTimeBottomSheetRef,
    accountSettingRef,
    openAccountSettings,
    closeAccountSettings,
    closeDeliveryTimeSheet
  } = useDeliveryModals();

  // Confirmation bottom sheet ref
  const confirmationRef = useRef<BottomSheetRef>(null);

  // Selected delivery for confirmation modal
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | undefined>(undefined);

  // Far-from-delivery popup: show when driver marks delivered but is >500m from delivery location
  const [showFarFromDeliveryPopup, setShowFarFromDeliveryPopup] = useState(false);
  const [farFromDeliveryData, setFarFromDeliveryData] = useState<{
    deliveryId: string;
    distanceMeters: number;
    attr?: UpdateDeliveryReq;
  } | null>(null);
  const [isFarFromDeliveryLoading, setIsFarFromDeliveryLoading] = useState(false);

  // ========================================
  // CUSTOM HOOKS - NAVIGATION & MAP
  // ========================================

  const { country } = currentDriver;
  const { driverLocation, isBearingReady } = useDriverLocation();

  // Next delivery is always the first one (index 0) since completed deliveries are filtered out
  const nextDelivery = filteredDeliveries.length > 0 ? filteredDeliveries[0] : null;

  // Routes calculated based on filtered deliveries (matches what's shown on map)
  const { staticRouteSegments, activeRoute, isStaticRoutesLoading } = useDeliveryRoutes(filteredDeliveries, driverLocation);

  const { centerOnDriver } = useNavigationCamera(mapRef);

  // ========================================
  // DELIVERY ACTION HOOKS
  // ========================================

  const handleFinishShift = useFinishShift({
    deliveryTime: filters.deliveryTime,
    day: filters.day,
    currentDriverId: currentDriver.id,
    setFinishShiftPopUp
  });

  const { handleMarkAsDelivered } = useDeliveryActions({
    dispatch,
    handleFinishShift,
    country
  });

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Set navigation header dynamically
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => null, // Will be set by component
      headerTransparent: true,
      headerStyle: {
        backgroundColor: 'transparent'
      }
    });
  }, [navigation]);

  /**
   * Automatically center map on driver when location updates.
   * Only runs when map is mounted (isBearingReady) so mapRef is available.
   */
  useEffect(() => {
    if (!driverLocation || !isBearingReady) return;

    const destination = nextDelivery
      ? {
          latitude: nextDelivery.deliveryAddress.lat,
          longitude: nextDelivery.deliveryAddress.lng
        }
      : undefined;

    centerOnDriver(driverLocation, destination);
  }, [driverLocation, isBearingReady, nextDelivery, centerOnDriver]);

  /**
   * Initialize live tracking and idle timer
   */
  useEffect(() => {
    verifyVersion();
    startLiveTracking();
    IdleTimerManager.setIdleTimerDisabled(true);
    return () => {
      IdleTimerManager.setIdleTimerDisabled(false);
      stopLiveTracking();
    };
  }, [verifyVersion, startLiveTracking, stopLiveTracking]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Check if delivery is out of sequence
   *
   * LOGIC:
   * - If the first delivery (index 0) exists and is NOT "delivered", then it should be picked next
   * - Any other delivery (index 1, 2, 3, etc.) would be out of sequence
   * - If delivery at index 0 is "delivered", check index 1, and so on
   *
   * EXAMPLE:
   * - filteredDeliveries = [Delivery1 (new/delivering), Delivery2 (new), Delivery3 (new)]
   * - Delivery1 at index 0 is not delivered → should pick Delivery1 next
   * - Picking Delivery1 (index 0) = in sequence ✓
   * - Picking Delivery2 (index 1) or Delivery3 (index 2) = out of sequence ✗
   */
  const checkIfOutOfSequence = useCallback(
    (deliveryId: string): boolean => {
      // Find the index of the delivery being picked
      const deliveryIndex = filteredDeliveries.findIndex((d) => d.id === deliveryId);
      // If delivery not found in filteredDeliveries, return false (not out of sequence)
      // This allows the delivery to proceed normally - it might be from a different tab/filter
      if (deliveryIndex === -1) return false;

      // Find the first delivery that is NOT "delivered"
      // This is the delivery that should be picked next
      let expectedNextIndex = -1;
      for (let i = 0; i < filteredDeliveries.length; i++) {
        if (filteredDeliveries[i].deliveryStatus !== DDeliveryStatus.delivered) {
          expectedNextIndex = i;
          break;
        }
      }

      // If all deliveries are delivered, nothing is out of sequence
      if (expectedNextIndex === -1) return false;

      // Delivery is out of sequence if it's not the expected next delivery
      return deliveryIndex !== expectedNextIndex;
    },

    [filteredDeliveries]
  );

  /**
   * Start delivery for a specific delivery
   */
  const startDelivery = async (deliveryId: string): Promise<void> => {
    try {
      await handleUpdateDelivery(deliveryId, {
        deliveryStatus: DDeliveryStatus.delivering
      });
      // Note: We don't need to update nextDeliveryIndex here because
      // checkIfOutOfSequence now calculates it dynamically based on delivery statuses
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went wrong with Start Delivery');
    }
  };

  /**
   * Handler: Update Delivery
   */
  const handleUpdateDelivery = useCallback(
    async (id: string, attr: UpdateDeliveryReq) => {
      if (isShiftStarted) {
        try {
          await handleMarkAsDelivered(id, attr, statusCounts, searchText);
        } catch (error: unknown) {
          handleErrorCheck(error, 'Something went wrong with update Delivery');
        }
      } else {
        setShowShiftWarnPopUp(true);
      }
    },
    [isShiftStarted, handleMarkAsDelivered, statusCounts, searchText, setShowShiftWarnPopUp]
  );

  /**
   * Mark as delivered (shared logic): update delivery + optionally start next.
   */
  const performMarkAsDelivered = useCallback(
    async (deliveryId: string, attr: UpdateDeliveryReq) => {
      const apiContract = { deliveryStatus: DDeliveryStatus.delivered, ...attr };
      await handleMarkAsDelivered(deliveryId, apiContract, statusCounts, searchText);

      const remainingDeliveries = filteredDeliveries.filter(
        (delivery) =>
          delivery.deliveryStatus !== DDeliveryStatus.delivered && delivery.deliveryStatus !== DDeliveryStatus.delivering
      );

      if (remainingDeliveries.length > 0) {
        await startDelivery(remainingDeliveries[0].id);
      }
    },
    [handleUpdateDelivery, filteredDeliveries, startDelivery]
  );

  /**
   * Handler: Mark as Delivered
   * If driver is >500m from delivery location, show popup asking for confirmation and reason.
   */
  const onMarkAsDelivered = useCallback(
    async (deliveryId: string, attr?: UpdateDeliveryReq) => {
      if (!isShiftStarted) {
        setShowShiftWarnPopUp(true);
        return;
      }

      const delivery = filteredDeliveries.find((d) => d.id === deliveryId);
      if (!delivery?.deliveryAddress?.lat || !delivery?.deliveryAddress?.lng) {
        snackbarShow('Delivery address not found', true);
        return;
      }

      const deliveryCoords = {
        latitude: delivery.deliveryAddress.lat,
        longitude: delivery.deliveryAddress.lng
      };

      const distanceMeters = driverLocation ? getDistance(driverLocation, deliveryCoords) : 1000;
      if (driverLocation && distanceMeters > maxDeliveryDistanceMeters) {
        setFarFromDeliveryData({ deliveryId, distanceMeters, attr });
        setShowFarFromDeliveryPopup(true);
        return;
      }

      await performMarkAsDelivered(deliveryId, { deliveryStatus: DDeliveryStatus.delivered, ...attr });
    },
    [isShiftStarted, filteredDeliveries, driverLocation, maxDeliveryDistanceMeters, performMarkAsDelivered, setShowShiftWarnPopUp]
  );

  const handleDelivered = async (item: Delivery) => {
    if (isShiftStarted) {
      // Open POD modal instead of directly marking as delivered
      setPodDelivery(item);
      setIsPODModalVisible(true);
    } else {
      setShowShiftWarnPopUp(true);
    }
  };

  /**
   * Confirm marking as delivered from far away from customer location (with reason).
   */
  const handleConfirmFarFromDelivery = useCallback(
    async (reason: string) => {
      if (!farFromDeliveryData) return;
      setIsFarFromDeliveryLoading(true);
      try {
        await Promise.all([
          addActions(farFromDeliveryData.deliveryId, [
            {
              note: reason,
              createdAt: '',
              type: RouteItemActionType.DELIVERY_FAR_FROM_LOCATION
            }
          ]),
          await performMarkAsDelivered(farFromDeliveryData.deliveryId, {
            deliveryStatus: DDeliveryStatus.delivered,
            ...farFromDeliveryData.attr
          })
        ]);
      } catch (error: unknown) {
        handleErrorCheck(error, 'Something went wrong with mark as delivered');
      } finally {
        setShowFarFromDeliveryPopup(false);
        setFarFromDeliveryData(null);
        setIsFarFromDeliveryLoading(false);
      }
    },
    [farFromDeliveryData, performMarkAsDelivered, addActions]
  );

  /**
   * Cancel far-from-delivery popup. Always reset state when modal closes so it can show again.
   * Also reset selectedDelivery so user can click "Delivered" again and re-trigger the flow.
   */
  const handleCancelFarFromDelivery = useCallback(() => {
    setShowFarFromDeliveryPopup(false);
    setFarFromDeliveryData(null);
    setIsFarFromDeliveryLoading(false);
    setSelectedDelivery(undefined);
  }, []);

  /**
   * Called by CoolerBagManagement instead of onMarkAsDelivered directly.
   * Stores the cooler bag attrs so they can be merged with POD data, then
   * opens the POD modal. CoolerBagManagement calls navigation.goBack() after
   * this resolves, so the POD modal will already be ready when DeliveriesV2
   * becomes visible again.
   */
  const handleMarkAsDeliveredFromCoolerBag = useCallback(async (delivery: Delivery, coolerBagAttr: UpdateDeliveryReq) => {
    setPendingCoolerBagAttr(coolerBagAttr);
    setPodDelivery(delivery);
    setIsPODModalVisible(true);
  }, []);

  /**
   * Navigate to CoolerBagManagement screen
   */
  const navigateToCoolerBagManagement = useCallback(
    (delivery: Delivery) => {
      navigation.navigate(ROUTES.CoolerBagManagement, { delivery, handleMarkAsDelivered: handleMarkAsDeliveredFromCoolerBag });
    },
    [handleMarkAsDeliveredFromCoolerBag, navigation]
  );

  /**
   * Handler: Request address change
   */
  const requestAddressChange = useCallback(async (id: string, attr: Record<string, string | number | undefined>) => {
    updateAddress(id, attr);
  }, []);

  /**
   * Handler: Add note
   */
  const handleAddingNote = useCallback(
    async (delivery: Delivery, note: string, images?: string[]) => {
      try {
        await addNote(delivery.userId, note, delivery.deliveryAddress.id, images);
        delivery.deliveryAddress.driverNote = note;
        delivery.deliveryAddress.driverImages = images;
        updateDelivery(delivery);
        snackbarShow('Note successfully added', false);
      } catch (error: unknown) {
        handleErrorCheck(error, 'Something went wrong with adding note');
      }
      refetch();
    },
    [updateDelivery, refetch]
  );

  /**
   * Handler: Logout
   */
  const handleLogout = useCallback(async () => {
    try {
      await Auth.signOut();
      stopLiveTracking();
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went with sign-out');
    }
  }, [stopLiveTracking]);

  /**
   * Handler: Open link for app version update
   */
  const openLink = useCallback(async () => {
    if (newVersionLink) {
      await Linking.openURL(newVersionLink);
      BackHandler.exitApp();
    } else {
      handleErrorCheck(
        '',
        'Something went wrong with new app link, please contact logistics managers to provide new APK for this app'
      );
    }
  }, [newVersionLink]);

  /**
   * Handler: Skip shift
   */
  const handleSkipShift = useCallback(() => {
    closeAccountSettings();
  }, [closeAccountSettings]);

  /**
   * Handler: Continue shift (remove FINISHED_SHIFT action)
   */
  const continueShift = useCallback(async () => {
    if (shift) {
      try {
        const newActions = [...shift.driverActions];
        newActions.splice(newActions.length - 1, 1);
        await updateShift(shift.id, { driverActions: newActions });
        await refetchShift();
      } catch (error: unknown) {
        handleErrorCheck(error, 'Something went wrong with continue shift');
      }
    }
  }, [shift, refetchShift]);

  /**
   * Handler: Delivery time change
   */
  const handleDeliveryTimeChange = useCallback(
    (deliveryTime: DeliveryTime) => {
      setFilters((prev) => ({ ...prev, deliveryTime }));
      closeDeliveryTimeSheet();
    },
    [closeDeliveryTimeSheet]
  );

  /**
   * When on DeliveriesV2 and the current shift is not started (e.g. user changed to morning and morning is not started), navigate back to Home with that shift selected.
   */
  useEffect(() => {
    if (shiftLoading || isShiftStarted) return;
    navigation.navigate(ROUTES.Home, { deliveryTime: filters.deliveryTime });
  }, [shiftLoading, isShiftStarted, filters.deliveryTime, navigation]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const shouldShowBottomSheet = statusCounts.totalDeliveries > 0;
  const [displayCustomMarkers, setDisplayCustomMarkers] = useState(false);

  /** Distance from driver to each delivery (meters), for card display e.g. "200 m away". Only computed for deliveries that are picked (status delivering). */
  const deliveryDistances = useMemo(() => {
    const map: Record<string, number> = {};
    if (!driverLocation) return map;
    for (const d of filteredDeliveries.filter((delivery) => delivery.deliveryStatus === DDeliveryStatus.delivering)) {
      const lat = d?.deliveryAddress?.lat;
      const lng = d?.deliveryAddress?.lng;
      if (lat !== null && lng !== null) {
        map[d.id] = getDistance(driverLocation, { latitude: lat, longitude: lng });
      }
    }
    return map;
  }, [driverLocation, filteredDeliveries]);

  const handlePODConfirm = async (images: Asset[], note?: string) => {
    if (!podDelivery) return;
    const imageUrls = await uploadPODImages(podDelivery.id, images);
    await onMarkAsDelivered(podDelivery.id, {
      ...pendingCoolerBagAttr,
      pod: {
        images: imageUrls,
        note: note
      }
    });
    setIsPODModalVisible(false);
    setPodDelivery(null);
    setPendingCoolerBagAttr(null);
  };

  const handlePODCancel = () => {
    setIsPODModalVisible(false);
    setPodDelivery(null);
    setPendingCoolerBagAttr(null);
    setSelectedDelivery(undefined);
  };

  const handlePODSkip = async (podSkipReason: string) => {
    if (!podDelivery) return;
    await onMarkAsDelivered(podDelivery.id, {
      ...(pendingCoolerBagAttr ?? {}),
      pod: {
        images: [],
        note: podSkipReason
      }
    });
    setIsPODModalVisible(false);
    setPodDelivery(null);
    setPendingCoolerBagAttr(null);
    setSelectedDelivery(undefined);
  };

  // ========================================
  // RETURN
  // ========================================

  return {
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
    showFarFromDeliveryPopUp: showFarFromDeliveryPopup,
    farFromDeliveryDistance: farFromDeliveryData?.distanceMeters ?? 0,
    isFarFromDeliveryLoading,
    handleConfirmFarFromDelivery,
    handleCancelFarFromDelivery,
    isSupported,
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
    handleAddingNote,
    requestAddressChange,
    navigateToCoolerBagManagement,

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
    isPODModalVisible,
    podDelivery,
    handlePODConfirm,
    handlePODCancel,
    handlePODSkip
  };
};
