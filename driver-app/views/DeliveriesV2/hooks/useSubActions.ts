/**
 * useSubActions Hook
 * ==================
 *
 * PURPOSE:
 * Manages sub-action modal state and handlers for delivery actions like:
 * - Unable to deliver
 * - Update delivery
 * - Add driver note
 * - Request address change
 *
 * USAGE:
 * const { subActionsInfo, handleSubActionData, handleConfirmAction, ... } = useSubActions({
 *   selectedDelivery,
 *   setSelectedDelivery,
 *   filteredDeliveries,
 *   startDelivery,
 *   handleAddingNote,
 *   requestAddressChange,
 *   refetch,
 *   refetchShift,
 * });
 */

import { useRef, useState, useCallback } from 'react';

import { addActions } from '@actions';
import { Delivery, RouteItemActionType } from '@calo/driver-types';
import { DDeliveryStatus } from '@calo/types';
import { BottomSheetRef } from '@components/BottomSheet';
import { mapSubActionToDetails } from '@helpers';
import { SubActionType } from '@lib/enums';

// ============================================================================
// TYPES
// ============================================================================

interface SubActionsInfo {
  title: string;
  subTitle: string;
  info: string;
}

interface UseSubActionsParams {
  selectedDelivery: Delivery | undefined;
  setSelectedDelivery: (delivery: Delivery | undefined) => void;
  filteredDeliveries: Delivery[];
  startDelivery: (deliveryId: string) => Promise<void>;
  handleAddingNote: (delivery: Delivery, note: string, images?: string[]) => Promise<void>;
  requestAddressChange: (id: string, attr: Record<string, string | number | undefined>) => Promise<void>;
  refetch: () => Promise<unknown>;
  refetchShift: () => Promise<unknown>;
}

interface UseSubActionsResult {
  // Refs
  actionModalRef: React.RefObject<BottomSheetRef>;
  updateDeliveryModalRef: React.RefObject<BottomSheetRef>;
  unableToDeliverModalRef: React.RefObject<BottomSheetRef>;
  subActionRef: React.RefObject<BottomSheetRef>;
  isOpeningActionModalRef: React.MutableRefObject<boolean>;

  // State
  subActionsInfo: SubActionsInfo;
  updatePinLocationPopup: boolean;
  setUpdatePinLocationPopup: (value: boolean) => void;

  // Handlers
  handleSubActionData: (subAction: SubActionType) => void;
  handleConfirmAction: (note?: string, googleLink?: string) => Promise<void>;
  handleOnCloseSheet: () => void;
  handleRefresh: () => Promise<void>;
  handleOpenActionModal: (delivery: Delivery) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useSubActions = ({
  selectedDelivery,
  setSelectedDelivery,
  filteredDeliveries,
  startDelivery,
  handleAddingNote,
  requestAddressChange,
  refetch,
  refetchShift
}: UseSubActionsParams): UseSubActionsResult => {
  // ========================================
  // REFS
  // ========================================

  const actionModalRef = useRef<BottomSheetRef>(null);
  const updateDeliveryModalRef = useRef<BottomSheetRef>(null);
  const unableToDeliverModalRef = useRef<BottomSheetRef>(null);
  const subActionRef = useRef<BottomSheetRef>(null);

  // Track if we're opening action modal vs confirmation modal
  // Use a ref to avoid race conditions with useLayoutEffect
  const isOpeningActionModalRef = useRef(false);

  // ========================================
  // STATE
  // ========================================

  const [subActionsInfo, setSubActionsInfo] = useState<SubActionsInfo>({
    title: '',
    subTitle: '',
    info: ''
  });
  const [updatePinLocationPopup, setUpdatePinLocationPopup] = useState<boolean>(false);

  // ========================================
  // HANDLERS
  // ========================================

  /**
   * Handle sub-action selection from bottom sheets
   */
  const handleSubActionData = useCallback((subAction: SubActionType) => {
    const { title, subTitle, info } = mapSubActionToDetails(subAction);
    setSubActionsInfo({ title, subTitle, info });
    updateDeliveryModalRef.current?.close();
    unableToDeliverModalRef.current?.close();

    if (title === RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES) {
      setUpdatePinLocationPopup(true);
    } else if (title) {
      subActionRef.current?.open();
    }
  }, []);

  /**
   * Handle confirmation of sub-action
   */
  const handleConfirmAction = useCallback(
    async (note?: string, googleLink?: string) => {
      // Early return if no delivery is selected
      if (!selectedDelivery) {
        return;
      }

      const actionType = subActionsInfo.title;
      const deliveryId = selectedDelivery.id;

      // Handle address change request with Google Maps link
      if (googleLink && actionType === RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES) {
        await requestAddressChange(deliveryId, { note, googleLink });
        return;
      }

      // Handle adding a driver note
      if (actionType === 'Add Driver Note') {
        await handleAddingNote(selectedDelivery, note ?? '');
        return;
      }

      // Handle all other action types
      await addActions(deliveryId, [
        {
          note,
          createdAt: '',
          type: actionType as Exclude<RouteItemActionType, RouteItemActionType.DRIVERS_REQUESTING_DELIVERY_LOCATION_UPDATES>
        }
      ]);
      // Refetch shift to update shiftRoute with new actions
      await refetchShift();

      // Find next delivery that is not delivered or delivering
      const nextDelivery = filteredDeliveries.filter(
        (delivery) =>
          delivery.deliveryStatus !== DDeliveryStatus.delivered && delivery.deliveryStatus !== DDeliveryStatus.delivering
      );

      if (nextDelivery.length > 0) {
        await startDelivery(nextDelivery[0].id);
      }
    },
    [
      selectedDelivery,
      subActionsInfo.title,
      filteredDeliveries,
      startDelivery,
      handleAddingNote,
      requestAddressChange,
      refetchShift
    ]
  );

  /**
   * Handle closing the sub-action sheet
   */
  const handleOnCloseSheet = useCallback(() => {
    setSubActionsInfo({ title: '', subTitle: '', info: '' });
    setSelectedDelivery(undefined);
  }, [setSelectedDelivery]);

  /**
   * Handle refresh for SubActionBottomSheetV2
   */
  const handleRefresh = useCallback(async () => {
    await refetch();
    await refetchShift();
  }, [refetch, refetchShift]);

  /**
   * Handler for opening action modal
   */
  const handleOpenActionModal = useCallback(
    (delivery: Delivery) => {
      // Set flag first to prevent confirmation modal from opening
      isOpeningActionModalRef.current = true;
      setSelectedDelivery(delivery);
      requestAnimationFrame(() => {
        if (actionModalRef.current) {
          actionModalRef.current.open();
        }
        // Reset flag after opening action modal
        setTimeout(() => {
          isOpeningActionModalRef.current = false;
        }, 200);
      });
    },
    [setSelectedDelivery]
  );

  // ========================================
  // RETURN
  // ========================================

  return {
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
  };
};
