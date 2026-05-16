/**
 * useDeliveryModals Hook
 * =====================
 *
 * PURPOSE:
 * Manages all modal states and popups in the DeliveriesV2 component.
 * Centralizes modal visibility logic.
 */

import { useState, useRef, useCallback } from 'react';

import { BottomSheetRef } from '@components/BottomSheet';

/**
 * Custom hook for managing delivery modals
 *
 * @returns Modal states and control functions
 */
export const useDeliveryModals = () => {
  // ========================================
  // STATE
  // ========================================

  const [finishShiftPopUp, setFinishShiftPopUp] = useState(false);
  const [showShiftWarnPopUp, setShowShiftWarnPopUp] = useState(false);

  // ========================================
  // REFS
  // ========================================

  const deliveryTimeBottomSheetRef = useRef<BottomSheetRef>(null);
  const accountSettingRef = useRef<BottomSheetRef>(null);

  // ========================================
  // HANDLERS
  // ========================================

  const openAccountSettings = useCallback(() => {
    accountSettingRef.current?.open();
  }, []);

  const closeAccountSettings = useCallback(() => {
    accountSettingRef.current?.close();
  }, []);

  const closeDeliveryTimeSheet = useCallback(() => {
    deliveryTimeBottomSheetRef.current?.close();
  }, []);

  // ========================================
  // RETURN
  // ========================================

  return {
    finishShiftPopUp,
    setFinishShiftPopUp,
    showShiftWarnPopUp,
    setShowShiftWarnPopUp,
    deliveryTimeBottomSheetRef,
    accountSettingRef,
    openAccountSettings,
    closeAccountSettings,
    closeDeliveryTimeSheet
  };
};
