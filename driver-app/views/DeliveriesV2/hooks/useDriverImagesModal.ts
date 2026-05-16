/**
 * useDriverImagesModal Hook
 * =========================
 *
 * PURPOSE:
 * Manages driver images modal state for viewing delivery address photos.
 *
 * USAGE:
 * const {
 *   isDriverImagesModalVisible,
 *   selectedDriverImagesDelivery,
 *   openDriverImagesModal,
 *   closeDriverImagesModal,
 * } = useDriverImagesModal();
 */

import { useState, useCallback } from 'react';

import { Delivery } from '@calo/driver-types';

// ============================================================================
// TYPES
// ============================================================================

interface UseDriverImagesModalResult {
  isDriverImagesModalVisible: boolean;
  selectedDriverImagesDelivery: Delivery | undefined;
  openDriverImagesModal: (delivery: Delivery) => void;
  closeDriverImagesModal: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useDriverImagesModal = (): UseDriverImagesModalResult => {
  const [isDriverImagesModalVisible, setIsDriverImagesModalVisible] = useState(false);
  const [selectedDriverImagesDelivery, setSelectedDriverImagesDelivery] = useState<Delivery | undefined>(undefined);

  const openDriverImagesModal = useCallback((delivery: Delivery) => {
    setSelectedDriverImagesDelivery(delivery);
    setIsDriverImagesModalVisible(true);
  }, []);

  const closeDriverImagesModal = useCallback(() => {
    setIsDriverImagesModalVisible(false);
    setSelectedDriverImagesDelivery(undefined);
  }, []);

  return {
    isDriverImagesModalVisible,
    selectedDriverImagesDelivery,
    openDriverImagesModal,
    closeDriverImagesModal
  };
};
