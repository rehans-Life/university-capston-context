/**
 * useHomeUI Hook
 * ==============
 *
 * Central hook that orchestrates all business logic for Home screen.
 * Handles state management, data fetching, shift workflow, and navigation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNavigation, useRoute } from '@react-navigation/native';
import { Auth } from 'aws-amplify';
import IdleTimerManager from 'react-native-idle-timer';

import { updateShift } from '@actions';
import { LatLng, ShiftActions, ShiftActionType } from '@calo/driver-types';
import { DDeliveryStatus } from '@calo/types';
import { BottomSheetRef } from '@components/BottomSheet';
import { getInitDeliveryTime, getInitDeliveryDay, handleErrorCheck } from '@helpers';
import { useShiftActions } from '@hooks';
import useAppVersionCheck from '@hooks/useAppVersionCheck';
import useCurrentUser from '@hooks/useCurrentUser';
import useDeliveryData from '@hooks/useDeliveries';
import useDeliveryActions from '@hooks/useDeliveryActions';
import useFilteredDeliveries from '@hooks/useFilteredDeliveries';
import useLiveTracking from '@hooks/useLiveTracking';
import useShift from '@hooks/useShift';
import { DeliveryTime } from '@lib/enums';
import { ROUTES } from '@navigation/types';

import { DeliveryFilters } from '../../../types/interfaces';
import { useDeliveryState } from '../../DeliveriesV2/hooks/useDeliveryState';
import { HomeNavigationProp, HomeRouteProp } from '../types';

// Types & Actions

export const useHomeUI = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const route = useRoute<HomeRouteProp>();
  const currentDriver = useCurrentUser();
  const { verifyVersion } = useAppVersionCheck();
  const [startLiveTracking, stopLiveTracking] = useLiveTracking();

  const deliveryTimeBottomSheetRef = useRef<BottomSheetRef>(null);
  const accountSettingRef = useRef<BottomSheetRef>(null);

  // ========================================
  // STATE
  // ========================================

  const [filters, setFilters] = useState<DeliveryFilters>({
    day: getInitDeliveryDay(),
    deliveryTime: getInitDeliveryTime(currentDriver.country)
  });

  const [searchText] = useState('');
  const [snapPointIndex, setSnapPointIndex] = useState(0);
  const [isInSetRouteStage, setIsInSetRouteStage] = useState(false);

  // ========================================
  // DATA FETCHING
  // ========================================

  const { deliveriesData, isLoading, refetch } = useDeliveryData(filters);

  const { shift, isShiftLoading: shiftLoading, isShiftStarted, isShiftFinished, refetchShift } = useShift(filters.deliveryTime);

  const { deliveryList, dispatch } = useDeliveryState(deliveriesData);

  // Filter deliveries by shift routePlan (instead of delivery time)
  const filteredByShift = useMemo(() => {
    const shiftDeliveriesIds = shift ? Object.keys(shift.routePlan) : [];
    return deliveryList.filter((d) => shiftDeliveriesIds.includes(d.id));
  }, [deliveryList, shift]);

  // Filter deliveries by search text (no tab filtering)
  const { searchDeliveries: filteredDeliveries } = useFilteredDeliveries(
    filteredByShift, // Use filteredByShift instead of deliveryList
    searchText
  );

  // Get delivered deliveries (for FinishedShiftPanel)
  const getDeliveredDeliveries = () => {
    return deliveryList.filter((delivery) => delivery.deliveryStatus === DDeliveryStatus.delivered);
  };

  const statusCounts = {
    new: deliveryList.filter((d) => {
      const isSameDeliveryTime = filters.deliveryTime === d.time;
      const status = d.deliveryStatus;
      // New: matching delivery time and no status or delivering status
      return isSameDeliveryTime && (!status || status === DDeliveryStatus.delivering);
    }).length,
    pending: deliveryList.filter((d) => {
      const isSameDeliveryTime = filters.deliveryTime === d.time;
      // Pending: matching delivery time and delivering status
      return isSameDeliveryTime && d.deliveryStatus === DDeliveryStatus.delivering;
    }).length,
    delivered: getDeliveredDeliveries().length,
    totalDeliveries: filteredDeliveries.length
  };

  // ========================================
  // DELIVERY ACTION HOOKS
  // ========================================

  // Home screen doesn't use finish shift logic, so pass empty function
  const handleFinishShift = async () => {
    // No-op: Home screen doesn't handle finish shift
  };

  const { handleMarkAsDelivered } = useDeliveryActions({
    dispatch,
    handleFinishShift,
    country: currentDriver.country
  });

  // ========================================
  // HANDLERS
  // ========================================

  const handleDeliveryTimeChange = (deliveryTime: DeliveryTime) => {
    setFilters((prev) => ({ ...prev, deliveryTime }));
  };

  const openAccountSettings = () => {
    accountSettingRef.current?.open();
  };

  const handleStartDelivering = () => {
    // Navigate to DeliveriesV2 when user clicks "Start Delivering" button
    navigation.navigate(ROUTES.DeliveriesV2, { deliveryTime: filters.deliveryTime });
  };

  const handleLogout = async () => {
    try {
      await Auth.signOut();
      stopLiveTracking();
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went with sign-out');
    }
    accountSettingRef.current?.close();
  };

  const handleSkipShift = () => {
    // Add skip shift logic here if needed
    accountSettingRef.current?.close();
  };

  /**
   * Handler: Continue shift (remove FINISHED_SHIFT action)
   */
  const continueShift = async () => {
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
  };

  const selectPreferredRoute = () => {
    setSnapPointIndex(0);
    setIsInSetRouteStage(true);
  };

  // ========================================
  // START SHIFT HOOK
  // ========================================

  const { startShift, handleStartShift, onStartDelivering, isStartingShift, kitchenModal, setKitchenModal, distance } =
    useShiftActions({
      shift,
      deliveryReFetch: refetch,
      filters
    });

  const onStartShift = async () => {
    await handleStartShift();
    await refetchShift();
    setSnapPointIndex(snapPointIndex < 2 ? snapPointIndex + 1 : 0);
  };

  const onStartDeliveringDeliveries = async (action: ShiftActions, driverPosition?: LatLng) => {
    try {
      await onStartDelivering(action, driverPosition);
      await refetchShift();
      setSnapPointIndex(snapPointIndex < 2 ? snapPointIndex + 1 : 0);
    } catch (error: unknown) {
      handleErrorCheck(error, 'Something went wrong with start delivering');
    }
  };

  /**
   * Start delivery for a specific delivery
   */
  const startDelivery = useCallback(
    async (deliveryId: string) => {
      try {
        await handleMarkAsDelivered(
          deliveryId,
          {
            deliveryStatus: DDeliveryStatus.delivering
          },
          statusCounts,
          searchText
        );
      } catch (error: unknown) {
        handleErrorCheck(error, 'Something went wrong with Start Delivery');
      }
    },
    [isShiftStarted, handleMarkAsDelivered, statusCounts, searchText]
  );

  /**
   * When navigated from DeliveriesV2 with a delivery time (e.g. user changed shift to morning and it was not started), select that shift on Home.
   */
  useEffect(() => {
    const deliveryTime = route.params?.deliveryTime;
    if (deliveryTime) {
      setFilters((prev) => ({ ...prev, deliveryTime }));
      navigation.setParams({ deliveryTime: undefined });
    }
  }, [route.params?.deliveryTime, navigation]);

  /**
   * Manage snap point index based on shift state
   */
  useEffect(() => {
    if (!shift) {
      setSnapPointIndex(0);
      return;
    }
    if (shift.driverActions.length === 0) {
      setSnapPointIndex(1);
      return;
    }
    const last = shift.driverActions[shift.driverActions.length - 1];

    switch (last.type) {
      case ShiftActionType.STARTED_SHIFT:
        setSnapPointIndex(2);
        break;
      case ShiftActionType.STARTED_DELIVERING:
        setSnapPointIndex(0);
        refetch().then(() => {
          navigation.navigate(ROUTES.DeliveriesV2, { deliveryTime: filters.deliveryTime });
        });
        break;
      case ShiftActionType.FINISHED_SHIFT:
        break;
      default:
        setSnapPointIndex(1);
    }
  }, [shift, navigation, filters.deliveryTime, refetch]);

  /**
   * Initialize version check, live tracking, and idle timer
   */
  useEffect(() => {
    verifyVersion();
    startLiveTracking();
    IdleTimerManager.setIdleTimerDisabled(true);
    return () => {
      IdleTimerManager.setIdleTimerDisabled(false);
    };
  }, []);

  // ========================================
  // RETURN
  // ========================================

  return {
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
    // handleUpdateShift,
    onStartShift,
    onStartDeliveringDeliveries,
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
  };
};
