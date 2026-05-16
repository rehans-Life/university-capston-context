/**
 * useDeliveryDetailsModal Hook
 * ============================
 *
 * PURPOSE:
 * Manages delivery details modal state for viewing delivery information
 * when a map marker is pressed.
 *
 * USAGE:
 * const {
 *   isDeliveryDetailsModalVisible,
 *   selectedDeliveryForDetails,
 *   handleMarkerPress,
 *   closeDeliveryDetailsModal,
 *   handleCallUser,
 * } = useDeliveryDetailsModal();
 */

import { useState, useCallback } from 'react';
import { Linking } from 'react-native';

import { Delivery } from '@calo/driver-types';

// ============================================================================
// TYPES
// ============================================================================

interface UseDeliveryDetailsModalResult {
  isDeliveryDetailsModalVisible: boolean;
  selectedDeliveryForDetails: Delivery | null;
  handleMarkerPress: (delivery: Delivery) => void;
  closeDeliveryDetailsModal: () => void;
  handleCallUser: (delivery: Delivery) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useDeliveryDetailsModal = (): UseDeliveryDetailsModalResult => {
  const [isDeliveryDetailsModalVisible, setIsDeliveryDetailsModalVisible] = useState(false);
  const [selectedDeliveryForDetails, setSelectedDeliveryForDetails] = useState<Delivery | null>(null);

  /**
   * Handle map marker press - show delivery details
   */
  const handleMarkerPress = useCallback((delivery: Delivery) => {
    setSelectedDeliveryForDetails(delivery);
    setIsDeliveryDetailsModalVisible(true);
  }, []);

  /**
   * Close delivery details modal
   */
  const closeDeliveryDetailsModal = useCallback(() => {
    setIsDeliveryDetailsModalVisible(false);
    setSelectedDeliveryForDetails(null);
  }, []);

  /**
   * Call the customer
   */
  const handleCallUser = useCallback((delivery: Delivery) => {
    if (delivery.phoneNumber) {
      Linking.openURL(`tel:${delivery.phoneNumber}`);
    }
  }, []);

  return {
    isDeliveryDetailsModalVisible,
    selectedDeliveryForDetails,
    handleMarkerPress,
    closeDeliveryDetailsModal,
    handleCallUser
  };
};
